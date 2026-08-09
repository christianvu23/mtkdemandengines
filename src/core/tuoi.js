// src/core/tuoi.js — Trục thời gian.
//
// Đây là khác biệt cốt lõi so với bài toán tìm ứng viên: hồ sơ LinkedIn là tài sản TĨNH,
// còn một nhu cầu thuê MKT là tín hiệu CÓ HẠN DÙNG. Giá trị của hệ thống này nằm ở tốc độ,
// nên độ tươi chiếm trọng số cao nhất trong rubric (25/100).

/** Số giờ kể từ lúc đăng. null nếu không biết thời điểm đăng. */
export function tinhTuoiGio(postedAt, now = new Date()) {
  if (!postedAt) return null;
  const t = postedAt instanceof Date ? postedAt : new Date(postedAt);
  if (Number.isNaN(t.getTime())) return null;
  return (now.getTime() - t.getTime()) / 3_600_000;
}

/** Hạn dùng = thời điểm đăng (hoặc thu thập) + TTL của nguồn. */
export function tinhHetHan(postedAt, ttlGio, capturedAt = new Date()) {
  const goc = postedAt ? new Date(postedAt) : capturedAt;
  const base = Number.isNaN(goc.getTime()) ? capturedAt : goc;
  return new Date(base.getTime() + (ttlGio ?? 72) * 3_600_000);
}

/** Lead còn hạn không. */
export function conHan(expiresAt, now = new Date()) {
  if (!expiresAt) return true; // không biết hạn → không tự loại
  const t = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  if (Number.isNaN(t.getTime())) return true;
  return t.getTime() > now.getTime();
}

/**
 * Chấm điểm độ tươi (0..25).
 * Bậc thang cố ý dốc ở 6 giờ đầu — đó là cửa sổ mà việc chạm trước còn tạo khác biệt.
 */
export function diemDoTuoi(tuoiGio) {
  if (tuoiGio == null) return 6; // không rõ → điểm giữa thấp, không thưởng cũng không phạt nặng
  if (tuoiGio < 0) return 6;     // thời gian tương lai → dữ liệu sai, xử như không rõ
  if (tuoiGio <= 2) return 25;
  if (tuoiGio <= 6) return 21;
  if (tuoiGio <= 12) return 18;
  if (tuoiGio <= 24) return 14;
  if (tuoiGio <= 48) return 8;
  if (tuoiGio <= 72) return 4;
  return 1;
}

/** Nhãn hiển thị cho UI. */
export function nhanDoTuoi(tuoiGio) {
  if (tuoiGio == null) return 'không rõ';
  if (tuoiGio < 1) return 'dưới 1 giờ';
  if (tuoiGio < 24) return `${Math.floor(tuoiGio)} giờ trước`;
  return `${Math.floor(tuoiGio / 24)} ngày trước`;
}
