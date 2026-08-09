// src/core/lienhe.js — Trích thông tin liên hệ từ text.
//
// Một lead không liên hệ được thì vô giá trị, dù nội dung hay đến mấy.
// Đây là lý do "khả năng liên hệ" chiếm 20/100 điểm trong rubric.

/** Đầu số di động Việt Nam hợp lệ sau chuẩn hoá về dạng 0xxxxxxxxx (10 số). */
const DAU_SO_HOP_LE = /^0(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])\d{7}$/;

/**
 * Chuẩn hoá một chuỗi số điện thoại về dạng 0xxxxxxxxx.
 * @returns {string|null} null nếu không hợp lệ
 */
export function chuanHoaSdt(raw) {
  if (!raw) return null;
  let s = String(raw).replace(/[^\d+]/g, '');
  if (s.startsWith('+84')) s = '0' + s.slice(3);
  else if (s.startsWith('84') && s.length === 11) s = '0' + s.slice(2);
  if (!s.startsWith('0')) s = '0' + s;
  return DAU_SO_HOP_LE.test(s) ? s : null;
}

/**
 * Trích tất cả số điện thoại VN trong text.
 * Chấp nhận các kiểu viết: 0901234567 · 090.123.4567 · 090 123 4567 · +84901234567
 */
export function trichSdt(text) {
  const t = String(text ?? '');
  const ungVien = t.match(/(?:\+?84|0)[\s.\-]?\d[\d\s.\-]{7,13}\d/g) || [];
  const ket = [];
  for (const uv of ungVien) {
    const sdt = chuanHoaSdt(uv);
    if (sdt && !ket.includes(sdt)) ket.push(sdt);
  }
  return ket;
}

/** Trích email. */
export function trichEmail(text) {
  const t = String(text ?? '');
  const m = t.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  return [...new Set(m.map((e) => e.toLowerCase()))];
}

/**
 * Trích Zalo. Ở VN Zalo thường viết kèm số điện thoại ("zalo: 0901234567")
 * hoặc link zalo.me. Trả về số hoặc link.
 */
export function trichZalo(text) {
  const t = String(text ?? '');
  const ket = [];
  const link = t.match(/(?:https?:\/\/)?zalo\.me\/[^\s)]+/gi) || [];
  ket.push(...link);
  // "zalo" đứng gần một số điện thoại (trong 40 ký tự)
  const gan = t.match(/zalo[^\d]{0,40}((?:\+?84|0)[\s.\-]?\d[\d\s.\-]{7,13}\d)/gi) || [];
  for (const g of gan) {
    for (const sdt of trichSdt(g)) {
      // Nếu số này đã nằm trong một link zalo.me đã bắt được thì không kể thành mục riêng —
      // tránh đếm trùng cùng một đường liên hệ dưới hai dạng.
      const daCoTrongLink = link.some((l) => l.replace(/\D/g, '').includes(sdt.slice(1)));
      if (!daCoTrongLink && !ket.includes(sdt)) ket.push(sdt);
    }
  }
  return ket;
}

/** Trích link liên hệ (form, fanpage, m.me, website). */
export function trichLink(text) {
  const t = String(text ?? '');
  return [...new Set(t.match(/https?:\/\/[^\s<>")]+/g) || [])];
}

/**
 * Tổng hợp thông tin liên hệ + xếp mức độ "chạm được".
 * @returns {{phone:string|null, zalo:string|null, email:string|null, url:string|null,
 *            mucDo:'truc_tiep'|'gian_tiep'|'khong_co', tatCa:object}}
 */
export function trichLienHe(text) {
  const phones = trichSdt(text);
  const zalos = trichZalo(text);
  const emails = trichEmail(text);
  const links = trichLink(text);

  let mucDo = 'khong_co';
  if (phones.length > 0 || zalos.length > 0) mucDo = 'truc_tiep';
  else if (emails.length > 0 || links.length > 0) mucDo = 'gian_tiep';

  return {
    phone: phones[0] ?? null,
    zalo: zalos[0] ?? null,
    email: emails[0] ?? null,
    url: links[0] ?? null,
    mucDo,
    tatCa: { phones, zalos, emails, links },
  };
}
