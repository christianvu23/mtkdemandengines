// src/core/ngansach.js — Đọc ngân sách từ text tiếng Việt.
//
// QUAN TRỌNG: theo quyết định của Christian ngày 09/08/2026 — "lấy hết, không lọc theo tiền".
// Module này CHỈ ghi nhận và chấm điểm mức độ nghiêm túc, KHÔNG dùng để cắt lead.
// Ngân sách được lưu để sau 2-3 tuần Learner có dữ liệu thật đề xuất ngưỡng.

import { boDau } from './chuanhoa.js';

/**
 * Chuẩn hoá NHẸ: bỏ dấu + thường + gom khoảng trắng, nhưng GIỮ dấu câu.
 * Bắt buộc phải giữ '-' và '~', nếu không thì "5-10tr" biến thành "5 10tr"
 * và không còn phân biệt được khoảng ngân sách với hai con số rời rạc.
 */
function chuanHoaNhe(s) {
  return boDau(s).toLowerCase().replace(/\s+/g, ' ').trim();
}

const DON_VI = {
  ty: 1_000_000_000,
  ti: 1_000_000_000,
  tr: 1_000_000,
  trieu: 1_000_000,
  cu: 1_000_000, // tiếng lóng: "5 củ"
  k: 1_000,
  nghin: 1_000,
  ngan: 1_000,
};

/** Cụm từ cho biết bên thuê không nêu số cụ thể. */
const THOA_THUAN = ['thoa thuan', 'deal', 'trao doi them', 'tuy nang luc', 'canh tranh',
  'hap dan', 'upto', 'up to', 'theo nang luc', 'lien he de biet'];

function doiSoVeVnd(so, donVi) {
  const he = DON_VI[donVi];
  if (!he) return null;
  return Math.round(so * he);
}

/**
 * Đọc ngân sách.
 * Nhận diện: "5tr", "5 triệu", "5-10tr", "500k", "5.000.000đ", "10 củ", "1 tỷ", "thoả thuận".
 * @returns {{min:number|null, max:number|null, text:string|null,
 *            loai:'cu_the'|'khoang'|'thoa_thuan'|'khong_neu', tienTe:'VND'|'USD'}}
 */
export function docNganSach(text) {
  const goc = String(text ?? '');
  const t = chuanHoaNhe(goc);
  const ketQuaRong = { min: null, max: null, text: null, loai: 'khong_neu', tienTe: 'VND' };
  if (!t) return ketQuaRong;

  // USD — ghi nhận riêng, không quy đổi (tỷ giá thay đổi, không tự bịa)
  const usd = goc.match(/\$\s?(\d[\d,.]*)\s*(?:-|–|den|to)?\s*\$?\s?(\d[\d,.]*)?/i);
  if (usd) {
    const a = Number(String(usd[1]).replace(/[,.]/g, ''));
    const b = usd[2] ? Number(String(usd[2]).replace(/[,.]/g, '')) : null;
    if (Number.isFinite(a)) {
      return { min: a, max: b ?? a, text: usd[0].trim(), loai: b ? 'khoang' : 'cu_the', tienTe: 'USD' };
    }
  }

  const dv = 'ty|ti|trieu|tr|cu|nghin|ngan|k';

  // Khoảng: "5-10tr", "5 den 10 trieu", "tu 5tr den 10tr"
  const khoang = t.match(new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(?:${dv})?\\s*(?:-|den|toi|~)\\s*(\\d+(?:[.,]\\d+)?)\\s*(${dv})`));
  if (khoang) {
    const donVi = khoang[3];
    const min = doiSoVeVnd(parseFloat(khoang[1].replace(',', '.')), donVi);
    const max = doiSoVeVnd(parseFloat(khoang[2].replace(',', '.')), donVi);
    if (min != null && max != null) {
      return { min, max, text: khoang[0].trim(), loai: 'khoang', tienTe: 'VND' };
    }
  }

  // Cụ thể có đơn vị: "5tr", "10 trieu", "1 ty", "500k"
  const cuThe = t.match(new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(${dv})\\b`));
  if (cuThe) {
    const v = doiSoVeVnd(parseFloat(cuThe[1].replace(',', '.')), cuThe[2]);
    if (v != null) return { min: v, max: v, text: cuThe[0].trim(), loai: 'cu_the', tienTe: 'VND' };
  }

  // Số đầy đủ có phân cách: "5.000.000", "5,000,000"
  const day = goc.match(/\b\d{1,3}(?:[.,]\d{3}){2,}\b/);
  if (day) {
    const v = Number(day[0].replace(/[.,]/g, ''));
    if (Number.isFinite(v) && v >= 100_000) {
      return { min: v, max: v, text: day[0], loai: 'cu_the', tienTe: 'VND' };
    }
  }

  if (THOA_THUAN.some((c) => t.includes(c))) {
    return { ...ketQuaRong, loai: 'thoa_thuan' };
  }
  return ketQuaRong;
}
