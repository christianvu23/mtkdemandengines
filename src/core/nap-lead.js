// src/core/nap-lead.js — Biến một mẩu nội dung thô thành lead đã chấm điểm.
//
// Đây là điểm hội tụ: cả cổng nạp tay lẫn scraper tự động đều đi qua đây,
// nên một lead nạp tay và một lead cào về được chấm bằng ĐÚNG một bộ luật.
// Hàm thuần — không I/O, unit-test được.

import { chuanHoaKey, khoaDuPhong, chuanHoaText } from './chuanhoa.js';
import { phanLoaiNhuCau, suyRaHinhThuc, doanKhuVuc } from './nhucau.js';
import { trichLienHe } from './lienhe.js';
import { docNganSach } from './ngansach.js';
import { chamDiem } from './rubric-lead.js';

/** Bỏ cú pháp markdown để phần chấm điểm nhìn thấy chữ, không nhìn thấy dấu. */
export function goMarkdown(md) {
  let s = String(md ?? '');
  // Strip HTML tags trước (tránh bị strip dấu > bởi regex bên dưới)
  s = s.replace(/<[^>]+>/g, ' ');
  return s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')      // ảnh
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')     // link → giữ nhãn
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')          // heading
    .replace(/[*_`]+/g, ' ')                     // nhấn mạnh, code (bỏ > để không strip HTML)
    .replace(/^\s*[-+*]\s+/gm, '')               // bullet
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/** Đoán tiêu đề: frontmatter title > heading markdown > câu đầu. */
export function doanTieuDe(noiDung, tieuDeCho = null) {
  if (tieuDeCho) return String(tieuDeCho).trim().slice(0, 300);
  const raw = String(noiDung ?? '');
  
  // 1. Thử parse frontmatter YAML (browser_run hay trả về)
  const fmMatch = raw.match(/^---\s*\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const fm = fmMatch[1];
    // title: "..." hoặc title: '...' hoặc title: ...
    const titleMatch = fm.match(/^title:\s*["']?([^"'\n]+)["']?\s*$/m);
    if (titleMatch) return titleMatch[1].trim().slice(0, 300);
  }
  
  // 2. Thử heading markdown
  const h = raw.match(/^\s{0,3}#{1,6}\s+(.+)$/m);
  if (h) return h[1].trim().slice(0, 300);
  
  // 3. Fallback: dòng đầu tiên sau khi strip markdown
  const dong = goMarkdown(raw).split('\n').map((s) => s.trim()).filter(Boolean);
  return (dong[0] ?? '').slice(0, 300) || null;
}

/**
 * Đếm dấu hiệu đã có nhiều người tranh — dùng cho phạt cạnh tranh.
 * Bắt các mẫu tiếng Việt kiểu "12 chào giá", "8 ứng viên", "20 lượt ứng tuyển".
 * @returns {number|null} null nếu không tìm thấy (khác 0 — 0 nghĩa là chắc chắn chưa ai)
 */
export function doDoCanhTranh(noiDung) {
  const t = chuanHoaText(noiDung);
  const m = t.match(/(\d+)\s*(chao gia|ung vien|ung tuyen|luot ung tuyen|bao gia|de xuat|freelancer da)/);
  if (m) return Number(m[1]);
  return null;
}

/**
 * Nạp một lead: chuẩn hoá → phân loại → chấm điểm → trả payload cho demand_inbox.
 *
 * @param {object} dauVao
 * @param {string} dauVao.source     mã nguồn trong demand_sources
 * @param {string} [dauVao.url]      link bài gốc (nếu có)
 * @param {string} dauVao.noiDung    text hoặc markdown
 * @param {string} [dauVao.tieuDe]
 * @param {string} [dauVao.postedAt] ISO time bài được đăng
 * @param {string} [dauVao.sourceQuery]
 * @param {Date}   [now]
 * @returns {{hopLe:boolean, lyDo?:string, payload?:object, ketQua?:object}}
 */
export function napLead(dauVao, now = new Date()) {
  const { source, url, noiDung, tieuDe, postedAt, sourceQuery } = dauVao ?? {};

  if (!source) return { hopLe: false, lyDo: 'Thiếu mã nguồn' };
  const thoRaw = String(noiDung ?? '').trim();
  if (thoRaw.length < 20) {
    return { hopLe: false, lyDo: 'Nội dung quá ngắn để chấm điểm (dưới 20 ký tự)' };
  }

  const vanBan = goMarkdown(thoRaw);
  const tieuDeCuoi = doanTieuDe(thoRaw, tieuDe);

  // Khoá dedup: ưu tiên URL; không có URL thì dựng khoá từ nội dung.
  const key = chuanHoaKey(url) ?? khoaDuPhong(source, vanBan);
  if (!key) return { hopLe: false, lyDo: 'Không dựng được khoá định danh' };

  const phanLoai = phanLoaiNhuCau(`${tieuDeCuoi ?? ''}\n${vanBan}`);
  
  // LOẠI BỎ THẲNG TAY: Jobs ngoài phạm vi dịch vụ của Christian
  // Christian cần: marketing, video, content, design, branding
  // KHÔNG cần: sales, kinh doanh, giám đốc, kế toán, lập trình
  if (phanLoai.ngoaiPhamVi.length > 0) {
    return { hopLe: false, lyDo: `Ngoài phạm vi: ${phanLoai.ngoaiPhamVi.join(', ')}` };
  }
  
  // Nếu không có nhu cầu marketing nào được detect → loại
  // (tránh lưu jobs không liên quan như "Tuyển bảo vệ", "Tuyển lái xe")
  if (phanLoai.nhuCau.length === 0) {
    return { hopLe: false, lyDo: 'Không phát hiện nhu cầu marketing' };
  }
  
  const lienHe = trichLienHe(vanBan);
  const nganSach = docNganSach(vanBan);
  const hinhThuc = suyRaHinhThuc(`${tieuDeCuoi ?? ''}\n${vanBan}`, phanLoai);
  const khuVuc = doanKhuVuc(`${tieuDeCuoi ?? ''}\n${vanBan}`);
  const canhTranh = doDoCanhTranh(vanBan);

  const ketQua = chamDiem(
    {
      title: tieuDeCuoi,
      raw_text: vanBan,
      posted_at: postedAt ?? null,
      hinh_thuc: hinhThuc,
      do_canh_tranh: canhTranh,
    },
    now,
  );

  return {
    hopLe: true,
    ketQua,
    payload: {
      lead_key: key,
      source,
      source_url: url ?? null,
      source_query: sourceQuery ?? null,
      posted_at: postedAt ?? null,
      title: tieuDeCuoi,
      raw_text: vanBan.slice(0, 8000),
      nhu_cau: phanLoai.nhuCau,
      khu_vuc: khuVuc,
      hinh_thuc: hinhThuc,
      contact_phone: lienHe.phone,
      contact_zalo: lienHe.zalo,
      contact_email: lienHe.email,
      contact_url: lienHe.url,
      budget_text: nganSach.text,
      budget_min: nganSach.tienTe === 'VND' ? nganSach.min : null,
      budget_max: nganSach.tienTe === 'VND' ? nganSach.max : null,
      score: ketQua.score,
      score_breakdown: ketQua.breakdown,
      tier: ketQua.tier,
      do_canh_tranh: canhTranh,
      auto_notes: ketQua.canhBao.length ? `Cảnh báo: ${ketQua.canhBao.join(', ')}` : null,
      evidence: url ? `Nguồn: ${url}` : `Nạp tay từ ${source}`,
    },
  };
}

/** Nạp cả lô, tách rõ cái nào vào được cái nào không. */
export function napNhieuLead(danhSach, now = new Date()) {
  const payloads = [];
  const boQua = [];
  for (const muc of danhSach ?? []) {
    const kq = napLead(muc, now);
    if (kq.hopLe) payloads.push(kq.payload);
    else boQua.push({ dauVao: muc, lyDo: kq.lyDo });
  }
  return { payloads, boQua, tongVao: (danhSach ?? []).length };
}
