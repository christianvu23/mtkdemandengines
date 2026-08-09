// src/core/router-lead.js — Định tuyến lead sau khi chấm điểm.
//
// Giữ nguyên triết lý của CMCTS: MÁY ĐỀ XUẤT, NGƯỜI BẤM.
// Router không tự liên hệ ai. Nó chỉ xếp lead vào 4 nhóm để Christian quyết định.
//
// LUẬT BẢO TOÀN: mỗi lead vào đúng MỘT nhóm, tổng 4 nhóm luôn bằng tổng đầu vào.
// Luật này được kiểm bằng test — nó chặn lỗi "lead biến mất" âm thầm.

/** @typedef {'push'|'enrich'|'hold'|'suppress'} Nhom */

/**
 * Quyết định nhóm cho một lead đã chấm điểm.
 * @param {{score:number, tier:string, canhBao:string[]}} ketQua
 * @returns {{nhom:Nhom, lyDo:string}}
 */
export function quyetDinh(ketQua) {
  const cb = ketQua.canhBao ?? [];

  if (cb.includes('het_han')) return { nhom: 'suppress', lyDo: 'Lead đã quá hạn dùng' };
  if (cb.includes('ngoai_pham_vi')) return { nhom: 'suppress', lyDo: 'Nhu cầu ngoài phạm vi dịch vụ' };
  if (ketQua.tier === 'D') return { nhom: 'suppress', lyDo: `Điểm quá thấp (${ketQua.score})` };

  const hangTot = ketQua.tier === 'A' || ketQua.tier === 'B';

  if (cb.includes('khong_co_lien_he')) {
    return hangTot
      ? { nhom: 'enrich', lyDo: 'Điểm tốt nhưng chưa có đường liên hệ — cần làm giàu' }
      : { nhom: 'hold', lyDo: 'Điểm trung bình và không có liên hệ' };
  }

  if (hangTot) return { nhom: 'push', lyDo: `Hạng ${ketQua.tier} (${ketQua.score} điểm), liên hệ được` };
  return { nhom: 'hold', lyDo: `Hạng C (${ketQua.score} điểm) — xem lại khi rảnh` };
}

/**
 * Định tuyến cả lô.
 * @param {Array<{lead:object, ketQua:object}>} danhSach
 * @returns {{push:Array, enrich:Array, hold:Array, suppress:Array, tongVao:number}}
 */
export function dinhTuyen(danhSach) {
  const ket = { push: [], enrich: [], hold: [], suppress: [], tongVao: danhSach.length };
  for (const muc of danhSach) {
    const { nhom, lyDo } = quyetDinh(muc.ketQua);
    ket[nhom].push({ ...muc, nhom, lyDo });
  }
  return ket;
}

/**
 * Kiểm luật bảo toàn. Ném lỗi nếu có lead bị mất hoặc nhân bản.
 * @throws {Error}
 */
export function kiemBaoToan(ket) {
  const tongRa = ket.push.length + ket.enrich.length + ket.hold.length + ket.suppress.length;
  if (tongRa !== ket.tongVao) {
    throw new Error(`Vi phạm luật bảo toàn: vào ${ket.tongVao}, ra ${tongRa}`);
  }
  return true;
}
