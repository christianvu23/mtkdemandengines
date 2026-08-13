// src/core/rubric-lead.js — Chấm điểm lead trên thang 100.
//
// ============================================================================
// CƠ SỞ THIẾT KẾ (quan trọng — đọc trước khi sửa trọng số)
//
// Christian xác nhận 09/08/2026 rằng anh nhận LÀM TẤT CẢ mảng marketing:
// content, quản trị kênh, quay dựng, thiết kế, branding, thương hiệu cá nhân,
// performance/ads, bán hàng, cộng đồng, PR/báo chí, sự kiện.
//
// Hệ quả: "độ khớp dịch vụ" gần như LUÔN đúng → nó là biến phân biệt YẾU.
// Vì vậy trọng số được dồn sang các trục thực sự phân biệt lead tốt/xấu:
//   1. Độ tươi        — giá trị của hệ thống này là tốc độ (25 điểm)
//   2. Khả năng liên hệ — lead không chạm được thì vô giá trị (20 điểm)
//   3. Độ cụ thể      — proxy cho mức độ nghiêm túc của bên thuê (20 điểm)
//
// Christian cũng chọn "lấy hết, không lọc theo tiền" → ngân sách CHỈ chấm điểm
// mức độ nghiêm túc (12 điểm), KHÔNG bao giờ dùng làm điều kiện cắt.
//
// ⚠️ Các ngưỡng dưới đây là GIẢ THUYẾT BAN ĐẦU, chưa hiệu chỉnh trên dữ liệu thật.
//    Sau 2-3 tuần chạy, Learner phải đọc dữ liệu thật và đề xuất chỉnh lại.
// ============================================================================

import { phanLoaiNhuCau, suyRaHinhThuc } from './nhucau.js';
import { trichLienHe } from './lienhe.js';
import { docNganSach } from './ngansach.js';
import { tinhTuoiGio, diemDoTuoi, conHan } from './tuoi.js';
import { chuanHoaText } from './chuanhoa.js';

export const TRONG_SO = Object.freeze({
  doTuoi: 25,
  khaNangLienHe: 20,
  doCuThe: 20,
  doKhopDichVu: 15,
  tinHieuNganSach: 12,
  hinhThuc: 8,
});

export const PHAT_CANH_TRANH_TOI_DA = 10;
export const NGUONG_TIER = Object.freeze({ A: 75, B: 60, C: 45 });

/** Bất biến: tổng trọng số phải bằng 100. Gọi trong test để chặn sửa nhầm. */
export function kiemBatBien() {
  const tong = Object.values(TRONG_SO).reduce((a, b) => a + b, 0);
  if (tong !== 100) {
    throw new Error(`Tổng trọng số rubric phải là 100, đang là ${tong}`);
  }
  return true;
}

// ---------- Các trục chấm điểm ----------

export function diemKhaNangLienHe(mucDo) {
  if (mucDo === 'truc_tiep') return TRONG_SO.khaNangLienHe;   // 20
  if (mucDo === 'gian_tiep') return 11;
  return 0;
}

/**
 * Độ cụ thể (0..20) — bên thuê càng mô tả rõ thì càng nghiêm túc.
 * Cộng dồn theo tín hiệu, cắt trần ở 20.
 */
export function diemDoCuThe(text) {
  const t = chuanHoaText(text);
  const goc = String(text ?? '');
  let d = 0;
  const tinHieu = [];

  // Nêu số lượng deliverable: "10 video", "3 bai/tuan", "2 clip"
  if (/\b\d+\s*(video|clip|bai|bai viet|post|banner|thiet ke|anh|hinh|buoi)\b/.test(t)) {
    d += 6; tinHieu.push('co_so_luong');
  }
  // Nêu thời hạn
  if (/(deadline|han chot|truoc ngay|trong tuan|trong thang|gap|ngay mai|cuoi tuan|thang \d|\d+ ngay)/.test(t)) {
    d += 4; tinHieu.push('co_thoi_han');
  }
  // Nêu ngành/sản phẩm cụ thể
  if (/(my pham|thoi trang|f b|nha hang|cafe|quan an|spa|tham my|giao duc|trung tam|bat dong san|noi that|me va be|thuc pham|do gia dung|phong gym|nha thuoc|khach san)/.test(t)) {
    d += 4; tinHieu.push('co_nganh');
  }
  // Độ dài mô tả
  if (goc.length >= 200) { d += 3; tinHieu.push('mo_ta_dai'); }
  if (goc.length >= 400) { d += 3; tinHieu.push('mo_ta_rat_dai'); }

  return { diem: Math.min(d, TRONG_SO.doCuThe), tinHieu };
}

export function diemDoKhopDichVu(phanLoai) {
  const soNhom = phanLoai.nhuCau.length;
  if (soNhom === 0) {
    // Không khớp nhóm nào VÀ có dấu hiệu ngoài phạm vi → 0
    return phanLoai.ngoaiPhamVi.length > 0 ? 0 : 4;
  }
  if (soNhom >= 2) return TRONG_SO.doKhopDichVu; // 15
  return 12;
}

export function diemTinHieuNganSach(ns) {
  if (ns.loai === 'cu_the' || ns.loai === 'khoang') return TRONG_SO.tinHieuNganSach; // 12
  if (ns.loai === 'thoa_thuan') return 7;
  return 4;
}

export function diemHinhThuc(hinhThuc) {
  // Ưu tiên freelancer/project-based - đúng nhu cầu Christian
  if (hinhThuc === 'freelance') return TRONG_SO.hinhThuc; // 8
  if (hinhThuc === 'retainer') return TRONG_SO.hinhThuc; // 8
  if (hinhThuc === 'du_an') return 6;
  if (hinhThuc === 'tuyen_dung') return 1; // tuyển toàn thời gian — không hợp freelance
  return 4; // khong_ro
}

/** Trừ điểm theo mức cạnh tranh (số người đã ứng tuyển/bình luận). */
export function phatCanhTranh(doCanhTranh) {
  if (doCanhTranh == null) return 0;
  const n = Number(doCanhTranh);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n <= 3) return 2;
  if (n <= 10) return 5;
  if (n <= 25) return 8;
  return PHAT_CANH_TRANH_TOI_DA;
}

export function xepTier(diem) {
  if (diem >= NGUONG_TIER.A) return 'A';
  if (diem >= NGUONG_TIER.B) return 'B';
  if (diem >= NGUONG_TIER.C) return 'C';
  return 'D';
}

/**
 * Chấm điểm một lead.
 * @param {object} lead
 * @param {string} lead.title
 * @param {string} lead.raw_text
 * @param {string|Date} [lead.posted_at]
 * @param {string|Date} [lead.expires_at]
 * @param {number} [lead.do_canh_tranh]
 * @param {Date} [now]
 * @returns {{score:number, tier:string, breakdown:object, suyRa:object, canhBao:string[]}}
 */
export function chamDiem(lead, now = new Date()) {
  const text = `${lead.title ?? ''}\n${lead.raw_text ?? ''}`;
  const canhBao = [];

  const phanLoai = phanLoaiNhuCau(text);
  const lienHe = trichLienHe(text);
  const nganSach = docNganSach(text);
  const hinhThuc = lead.hinh_thuc ?? suyRaHinhThuc(text);
  const tuoiGio = tinhTuoiGio(lead.posted_at, now);
  const conHanDung = conHan(lead.expires_at, now);

  const cuThe = diemDoCuThe(text);

  const breakdown = {
    doTuoi: diemDoTuoi(tuoiGio),
    khaNangLienHe: diemKhaNangLienHe(lienHe.mucDo),
    doCuThe: cuThe.diem,
    doKhopDichVu: diemDoKhopDichVu(phanLoai),
    tinHieuNganSach: diemTinHieuNganSach(nganSach),
    hinhThuc: diemHinhThuc(hinhThuc),
  };

  const tongCong = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const phat = phatCanhTranh(lead.do_canh_tranh);
  let score = Math.max(0, Math.min(100, tongCong - phat));

  // Điều kiện triệt tiêu — không phải trừ điểm mà là loại thẳng
  if (!conHanDung) {
    canhBao.push('het_han');
    score = 0;
  }
  if (phanLoai.nhuCau.length === 0 && phanLoai.ngoaiPhamVi.length > 0) {
    canhBao.push('ngoai_pham_vi');
    score = 0;
  }
  if (lienHe.mucDo === 'khong_co') canhBao.push('khong_co_lien_he');
  if (hinhThuc === 'tuyen_dung') canhBao.push('tuyen_toan_thoi_gian');
  if (tuoiGio == null) canhBao.push('khong_ro_thoi_diem_dang');

  return {
    score,
    tier: xepTier(score),
    breakdown: { ...breakdown, phatCanhTranh: -phat, tong: score },
    suyRa: {
      nhuCau: phanLoai.nhuCau,
      ngoaiPhamVi: phanLoai.ngoaiPhamVi,
      hinhThuc,
      khuVucGoiY: null, // do parse-lead điền
      lienHe,
      nganSach,
      tuoiGio,
      tinHieuCuThe: cuThe.tinHieu,
    },
    canhBao,
  };
}
