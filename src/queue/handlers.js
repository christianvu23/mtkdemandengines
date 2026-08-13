// queue/handlers.js — Tất cả logic xử lý queue job
// Không có I/O trực tiếp — chỉ gọi các hàm từ services/supabase.js
// Nguyên tắc: đơn trách nhiệm duy nhất = xử lý 1 message/theo loại message

import { lay } from '../transport/index.js';
import { kiemTraTransport } from '../services/supabase.js';
import { napNhieuLead } from '../core/nap-lead.js';
import { bocLinkBai } from '../core/boc-link.js';
import { capNghenguon } from '../services/supabase.js';

// --- Message type dispatch ---

export async function xuLyMotMessage(m, env) {
  if (!m || typeof m !== 'object') return { loi: 'Message không hợp lệ' };
  if (m.loai === 'quet_nguon') return xuLyQuetNguon(m, env);
  if (m.loai === 'lay_bai') return xuLyLayBai(m, env);
  return { loi: `Không biết loại message: ${m.loai}` };
}

// --- 'quet_nguon': lấy trang danh sách → tách link bài → đẩy từng link vào queue ---

export async function xuLyQuetNguon(m, env) {
  if (!m.url_danh_sach) return { bo_qua: 'chưa cấu hình url_danh_sach' };

  // Sử dụng transport từ env hoặc fallback
  const transport = env && env.AVAILABLE_TRANSPORT ? env.AVAILABLE_TRANSPORT : m.transport;

  const kq = await lay(m.url_danh_sach, transport, env);
  if (!kq.ok) {
    await capNghenguon(m.ma_nguon, {
      lan_loi_cuoi: new Date().toISOString(),
      so_loi_lien_tiep: (m.so_loi_lien_tiep ?? 0) + 1,
    });
    return { loi: kq.loi };
  }

  const boc = bocLinkBai(kq.noiDung, m.url_danh_sach, {
    regexBatBuoc: m.regex_link_bai ?? null,
    tran: m.tran ?? 40,
  });

  if (!boc.links.length) {
    return { bo_qua: `không tách được link bài (${boc.cachChon})`, thong_ke: boc.thongKe };
  }

  // Mỗi link là một job riêng → queue tự lo concurrency, không bị timeout.
  const jobBai = boc.links.map((link) => ({
    loai: 'lay_bai',
    run_label: m.run_label,
    ma_nguon: m.ma_nguon,
    transport: m.transport,
    source_query: m.url_danh_sach,
    url: link,
  }));

  for (let i = 0; i < jobBai.length; i += 100) {
    // Gửi batch đến queue — worker.queue() sẽ xử lý từng job
    // Giả sử env.QUEUE_QUET có sẵn; caller提供环境
    // await env.QUEUE_QUET.sendBatch(jobBai.slice(i, i + 100));
    // Lưu batch thay vì gửi ngay — handler xuLyMotMessage sẽ đợi
    // Trong demo: chỉ trả về queue payloads
    break; // chỉ lấy batch đầu để demo
  }

  // Cập nhật nguồn đã quét
  capNghenguon(m.ma_nguon, {
    lan_quet_cuoi: new Date().toISOString(),
    so_loi_lien_tiep: 0,
  });

  return {
    transport: kq.nguon, da_lui: !!kq.daLui,
    cach_tach_link: boc.cachChon, khuon: boc.khuon ?? null,
    so_link: boc.links.length,
  };
}

// --- 'lay_bai': lấy nội dung bài → chấm điểm → đẩy vào demand_inbox ---

export async function xuLyLayBai(m, env) {
  // Lấy nội dung bài từ URL
  const transport = env && env.AVAILABLE_TRANSPORT ? env.AVAILABLE_TRANSPORT : m.transport;
  const ct = await lay(m.url, transport, env);
  if (!ct.ok) return { loi: ct.loi };

  // Chấm điểm qua napNhieuLead
  const ctPayloads = [{ source: m.ma_nguon, url: m.url, noiDung: ct.noiDung, sourceQuery: m.source_query }];
  const { payloads, boQua } = napNhieuLead(ctPayloads);

  // Đẩy vào inbox (sử dụng services/supabase)
  // NOTE: caller phải cung cấp env.SUPABASE_URL/env.SUPABASE_SERVICE_KEY
  // hoặc dùng wrapper trong worker.js
  if (payloads.length) {
    //await napVaoInbox(payloads, m.run_label); // TODO: enable when env available
    // For now, just track
  }

  return { so_lead: payloads.length, bo_qua: boQua.length };
}

// --- Chuẩn bị message quet nguon ---

export function chuanBiMessageQuetNguon(nguonList, runLabel) {
  return (nguonList ?? [])
    .filter((ng) => ng.cau_hinh?.url_danh_sach)
    .map((ng) => ({
      loai: 'quet_nguon',
      run_label: runLabel,
      ma_nguon: ng.ma,
      transport: ng.transport,
      url_danh_sach: ng.cau_hinh.url_danh_sach,
      tran: ng.tran_lead_moi_dot ?? 40,
      regex_link_bai: ng.cau_hinh?.regex_link_bai ?? null,
      so_loi_lien_tiep: ng.so_loi_lien_tiep ?? 0,
    }));
}

// --- Trích xuất thông tin việc làm từ HTML (regex-based, không dùng DOMParser) ---

/**
 * Trích xuất thông tin việc làm từ nội dung HTML/Markdown
 * - Sử dụng regex (Workers-compatible, không cần DOMParser)
 * - Extract từ meta tags, structured data, và text patterns
 * - Trả về object có cấu trúc sẵn sàng hiển thị UI
 *
 * @param {string} html - Nội dung HTML từ quá trình scrape
 * @returns {object} Thông tin việc làm đã format
 */
export function extractJobInfo(html) {
  try {
    const text = String(html || '');

    // Extract title from og:title or <title>
    const ogTitleMatch = text.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
    const titleTagMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = ogTitleMatch?.[1] || titleTagMatch?.[1] || '';

    // Extract description from og:description
    const ogDescMatch = text.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
    const description = ogDescMatch?.[1] || '';

    // Extract image from og:image
    const ogImageMatch = text.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    const image = ogImageMatch?.[1] || null;

    // Extract company from title (pattern: "Company - Position" or similar)
    let company = null;
    if (title) {
      const parts = title.split('-');
      if (parts.length > 0) {
        company = parts[0].trim();
      }
    }

    // Extract location
    let location = null;
    if (company && company.includes('City Branch')) {
      location = company;
    }
    if (!location) {
      location = extractLocationFromText(description || text);
    }

    // Extract date posted
    let datePosted = null;
    const dateMatch = (description || text).match(/(Aug|Jan|Feb|Mar|Apr|May|Jun|Jul|Oct|Nov|Dec)\s*,?\s*\d{4}/i);
    if (dateMatch) {
      datePosted = dateMatch[0];
    }

    // Detect salary/benefits signals
    const descLower = (description || text).toLowerCase();
    const hasHighSalary = descLower.includes('high salary') || descLower.includes('lương cao');
    const hasGoodBenefits = descLower.includes('good benefits') || descLower.includes('quyền lợi tốt');

    return {
      company: company || 'Công ty chưa xác định',
      position: title ? title.split('-')[0].trim() : 'Vị trí chưa rõ',
      location: location || null,
      salary: hasHighSalary ? 'Cao' : 'Không rõ',
      benefits: hasGoodBenefits ? 'Tốt' : 'Không rõ',
      datePosted: datePosted || null,
      source: 'VietnamWorks',
      url: null,
      image: image || null,
      rawDescription: (description || '').slice(0, 500),
    };
  } catch (e) {
    console.error('Lỗi extractJobInfo:', e);
    return {
      company: 'Lỗi trích xuất',
      position: 'Lỗi',
      location: null,
      salary: 'Lỗi',
      benefits: 'Lỗi',
      datePosted: null,
      source: 'Lỗi',
      url: null,
      image: null,
      rawDescription: '',
    };
  }
}

/** Trích xuất địa điểm từ text mô tả */
function extractLocationFromText(text) {
  const vnCityPatterns = /(Hà Nội|Ho Chi Minh|Da Nang|Hai Phong|Can Tho|Binh Duong|Long An|Binh Thanh|Cu Chi)/i;
  const match = text.match(vnCityPatterns);
  return match ? match[0] : null;
}
