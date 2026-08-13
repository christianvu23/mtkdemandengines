// queue/handlers.js — Tất cả logic xử lý queue job
// Không có I/O trực tiếp — chỉ gọi các hàm từ services/supabase.js
// Nguyên tắc: đơn trách nhiệm duy nhất = xử lý 1 message/theo loại message

import { lay } from '../transport/index.js';
import { kiemTraTransport, capNghenguon, napVaoInbox } from '../services/supabase.js';
import { napNhieuLead } from '../core/nap-lead.js';
import { bocLinkBai } from '../core/boc-link.js';

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
    await capNghenguon(env, m.ma_nguon, {
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

  // Gửi jobs vào queue — worker.queue() sẽ xử lý từng job, không bị timeout
  let daGuiQueue = 0;
  if (env?.QUEUE_QUET) {
    for (let i = 0; i < jobBai.length; i += 100) {
      const batch = jobBai.slice(i, i + 100).map(body => ({ body }));
      await env.QUEUE_QUET.sendBatch(batch);
      daGuiQueue += batch.length;
    }
  }

  // Cập nhật nguồn đã quét
  capNghenguon(env, m.ma_nguon, {
    lan_quet_cuoi: new Date().toISOString(),
    so_loi_lien_tiep: 0,
  });

  return {
    transport: kq.nguon, da_lui: !!kq.daLui,
    cach_tach_link: boc.cachChon, khuon: boc.khuon ?? null,
    so_link: boc.links.length, da_gui_queue: daGuiQueue,
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
  if (payloads.length) {
    await napVaoInbox(payloads, m.run_label, env);
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
