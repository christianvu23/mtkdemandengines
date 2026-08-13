// src/core/chuanhoa.js — Chuẩn hoá text & khoá định danh.
// Hàm thuần, không I/O, để unit-test được và dùng chung giữa worker và test.
// PHẢI khớp hành vi với các hàm SQL dm_chuan_hoa_text / dm_chuan_hoa_key.

/** Bỏ dấu tiếng Việt (bao gồm đ/Đ). */
export function boDau(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Chuẩn hoá text để so sánh/hash.
 * Bỏ dấu → thường → mọi ký tự không phải [a-z0-9] thành khoảng trắng → gom khoảng trắng.
 * Tương đương SQL: dm_chuan_hoa_text()
 */
export function chuanHoaText(s) {
  return boDau(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * Chuẩn hoá URL thành khoá dedup.
 * Bỏ scheme, www/m/vn, tham số theo dõi (utm_*, fbclid, gclid, ref, source, open_from, search_id), dấu / cuối.
 * Tương đương SQL: dm_chuan_hoa_key()
 * @returns {string|null} null nếu rỗng
 */
export function chuanHoaKey(url) {
  let u = String(url ?? '').trim().toLowerCase();
  if (!u) return null;
  u = u.replace(/^https?:\/\/(www\.|m\.|vn\.)?/, '');
  u = u.replace(/[?&](utm_[^&]*|fbclid|gclid|ref|source|open_from|search_id)=[^&]*/g, '');
  u = u.replace(/\/+$/, '').trim();
  return u || null;
}

/**
 * Khoá rút gọn dùng khi KHÔNG có URL (ví dụ bài Facebook không lấy được permalink).
 * Ghép nguồn + 120 ký tự đầu của nội dung đã chuẩn hoá.
 */
export function khoaDuPhong(source, noiDung) {
  const t = chuanHoaText(noiDung).slice(0, 120);
  if (!t) return null;
  return `${source || 'khac'}:${t.replace(/ /g, '-')}`;
}

/**
 * Độ tương đồng Jaccard trên tập token — dùng để phát hiện bài đăng lại
 * mà hash tuyệt đối không bắt được (sửa vài chữ, thêm emoji).
 * @returns {number} 0..1
 */
export function doTuongDong(a, b) {
  const ta = new Set(chuanHoaText(a).split(' ').filter(Boolean));
  const tb = new Set(chuanHoaText(b).split(' ').filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let giao = 0;
  for (const t of ta) if (tb.has(t)) giao++;
  return giao / (ta.size + tb.size - giao);
}
