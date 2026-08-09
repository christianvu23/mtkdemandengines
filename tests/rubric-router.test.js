import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chamDiem, kiemBatBien, TRONG_SO, xepTier, phatCanhTranh } from '../src/core/rubric-lead.js';
import { quyetDinh, dinhTuyen, kiemBaoToan } from '../src/core/router-lead.js';

const NOW = new Date('2026-08-09T12:00:00Z');
const gioTruoc = (n) => new Date(NOW.getTime() - n * 3_600_000).toISOString();

const LEAD_VANG = {
  title: 'Cần bạn quay dựng video TikTok + thiết kế banner cho shop mỹ phẩm',
  raw_text:
    'Shop mỹ phẩm bên mình cần tìm bạn quay dựng video TikTok và thiết kế banner, ' +
    'khoảng 10 video mỗi tháng, hợp tác lâu dài hàng tháng. Deadline lô đầu vào cuối tuần này. ' +
    'Ngân sách 5-10tr/tháng tuỳ khối lượng. Bạn nào quan tâm liên hệ Zalo 0901234567 nhé, ' +
    'mình phản hồi nhanh trong ngày. Ưu tiên bạn đã làm cho ngành mỹ phẩm.',
  posted_at: gioTruoc(1),
  expires_at: new Date(NOW.getTime() + 40 * 3_600_000).toISOString(),
};

const LEAD_NGOAI_PHAM_VI = {
  title: 'Tuyển lập trình viên backend NodeJS full time',
  raw_text: 'Làm việc tại văn phòng, giờ hành chính, có bảo hiểm xã hội.',
  posted_at: gioTruoc(3),
};

const LEAD_HET_HAN = {
  title: 'Cần người làm content cho fanpage',
  raw_text: 'LH 0901234567',
  posted_at: gioTruoc(200),
  expires_at: new Date(NOW.getTime() - 10 * 3_600_000).toISOString(),
};

const LEAD_KHONG_LIEN_HE = {
  title: 'Tìm bạn làm content và thiết kế cho quán cafe',
  raw_text:
    'Quán cafe mình cần bạn làm content và thiết kế ấn phẩm, khoảng 8 bài mỗi tháng, ' +
    'hợp tác lâu dài. Ngân sách 5tr/tháng. Bạn nào quan tâm comment bên dưới mình xem nhé. ' +
    'Deadline bắt đầu từ tuần sau, ưu tiên bạn ở gần quán.',
  posted_at: gioTruoc(2),
};

// ---------- Bất biến ----------
test('BẤT BIẾN: tổng trọng số rubric luôn bằng 100', () => {
  assert.equal(kiemBatBien(), true);
  assert.equal(Object.values(TRONG_SO).reduce((a, b) => a + b, 0), 100);
});

test('xepTier khớp ngưỡng đã công bố', () => {
  assert.equal(xepTier(75), 'A');
  assert.equal(xepTier(74), 'B');
  assert.equal(xepTier(60), 'B');
  assert.equal(xepTier(59), 'C');
  assert.equal(xepTier(45), 'C');
  assert.equal(xepTier(44), 'D');
});

// ---------- Chấm điểm ----------
test('lead vàng (tươi, chạm được, cụ thể, retainer) phải ra hạng A', () => {
  const r = chamDiem(LEAD_VANG, NOW);
  assert.equal(r.tier, 'A');
  assert.ok(r.score >= 75, `score=${r.score}`);
  assert.equal(r.breakdown.doTuoi, 25);
  assert.equal(r.breakdown.khaNangLienHe, 20);
  assert.equal(r.suyRa.hinhThuc, 'retainer');
  assert.equal(r.suyRa.nganSach.loai, 'khoang');
  assert.deepEqual(r.canhBao, []);
});

test('nhu cầu ngoài phạm vi bị triệt tiêu về 0 điểm, không phải chỉ trừ điểm', () => {
  const r = chamDiem(LEAD_NGOAI_PHAM_VI, NOW);
  assert.equal(r.score, 0);
  assert.equal(r.tier, 'D');
  assert.ok(r.canhBao.includes('ngoai_pham_vi'));
});

test('lead hết hạn bị triệt tiêu dù nội dung có khớp dịch vụ', () => {
  const r = chamDiem(LEAD_HET_HAN, NOW);
  assert.equal(r.score, 0);
  assert.ok(r.canhBao.includes('het_han'));
});

test('thiếu đường liên hệ làm mất trọn 20 điểm và bật cảnh báo', () => {
  const r = chamDiem(LEAD_KHONG_LIEN_HE, NOW);
  assert.equal(r.breakdown.khaNangLienHe, 0);
  assert.ok(r.canhBao.includes('khong_co_lien_he'));
});

test('điểm luôn nằm trong khoảng 0..100 kể cả khi phạt cạnh tranh tối đa', () => {
  const r = chamDiem({ ...LEAD_VANG, do_canh_tranh: 999 }, NOW);
  assert.ok(r.score >= 0 && r.score <= 100);
  assert.equal(r.breakdown.phatCanhTranh, -10);
});

test('phạt cạnh tranh tăng theo bậc và có trần', () => {
  assert.equal(phatCanhTranh(null), 0);
  assert.equal(phatCanhTranh(0), 0);
  assert.equal(phatCanhTranh(2), 2);
  assert.equal(phatCanhTranh(8), 5);
  assert.equal(phatCanhTranh(20), 8);
  assert.equal(phatCanhTranh(1000), 10);
});

test('ngân sách KHÔNG bao giờ là điều kiện cắt — chỉ ảnh hưởng điểm', () => {
  const khongTien = { ...LEAD_VANG, raw_text: LEAD_VANG.raw_text.replace('Ngân sách 5-10tr/tháng tuỳ khối lượng.', '') };
  const r = chamDiem(khongTien, NOW);
  assert.ok(r.score > 0, 'lead không nêu tiền vẫn phải có điểm');
  assert.ok(!r.canhBao.includes('khong_co_ngan_sach'), 'không được có cảnh báo cắt theo tiền');
});

// ---------- Định tuyến ----------
test('lead hạng A có liên hệ → push', () => {
  assert.equal(quyetDinh(chamDiem(LEAD_VANG, NOW)).nhom, 'push');
});

test('điểm tốt nhưng không có liên hệ → enrich, không phải vứt đi', () => {
  const r = chamDiem(LEAD_KHONG_LIEN_HE, NOW);
  const qd = quyetDinh(r);
  assert.ok(['enrich', 'hold'].includes(qd.nhom));
  if (r.tier === 'A' || r.tier === 'B') assert.equal(qd.nhom, 'enrich');
});

test('lead hết hạn và ngoài phạm vi → suppress', () => {
  assert.equal(quyetDinh(chamDiem(LEAD_HET_HAN, NOW)).nhom, 'suppress');
  assert.equal(quyetDinh(chamDiem(LEAD_NGOAI_PHAM_VI, NOW)).nhom, 'suppress');
});

test('LUẬT BẢO TOÀN: không lead nào biến mất hay bị nhân bản', () => {
  const loat = [LEAD_VANG, LEAD_NGOAI_PHAM_VI, LEAD_HET_HAN, LEAD_KHONG_LIEN_HE]
    .map((lead) => ({ lead, ketQua: chamDiem(lead, NOW) }));
  const ket = dinhTuyen(loat);
  assert.equal(kiemBaoToan(ket), true);
  assert.equal(ket.push.length + ket.enrich.length + ket.hold.length + ket.suppress.length, 4);
});

test('kiemBaoToan phát hiện được khi có lead bị mất', () => {
  const hong = { push: [], enrich: [], hold: [], suppress: [], tongVao: 3 };
  assert.throws(() => kiemBaoToan(hong), /bảo toàn/);
});

test('mỗi lead chỉ vào đúng một nhóm', () => {
  const loat = [LEAD_VANG, LEAD_KHONG_LIEN_HE].map((lead) => ({ lead, ketQua: chamDiem(lead, NOW) }));
  const ket = dinhTuyen(loat);
  const tatCa = [...ket.push, ...ket.enrich, ...ket.hold, ...ket.suppress];
  const tieuDe = tatCa.map((m) => m.lead.title);
  assert.equal(new Set(tieuDe).size, tieuDe.length);
});
