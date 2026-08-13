import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chuanHoaSdt, trichSdt, trichEmail, trichZalo, trichLienHe } from '../src/core/lienhe.js';
import { docNganSach } from '../src/core/ngansach.js';
import { phanLoaiNhuCau, suyRaHinhThuc, doanKhuVuc } from '../src/core/nhucau.js';
import { tinhTuoiGio, diemDoTuoi, conHan, tinhHetHan } from '../src/core/tuoi.js';

// ---------- Liên hệ ----------
test('chuanHoaSdt chấp nhận các cách viết số VN', () => {
  assert.equal(chuanHoaSdt('0901234567'), '0901234567');
  assert.equal(chuanHoaSdt('090.123.4567'), '0901234567');
  assert.equal(chuanHoaSdt('+84901234567'), '0901234567');
  assert.equal(chuanHoaSdt('84901234567'), '0901234567');
});

test('chuanHoaSdt loại số sai đầu số hoặc sai độ dài', () => {
  assert.equal(chuanHoaSdt('0201234567'), null); // đầu số không hợp lệ
  assert.equal(chuanHoaSdt('09012345'), null);   // quá ngắn
  assert.equal(chuanHoaSdt(''), null);
});

test('trichSdt lấy được số nằm trong câu', () => {
  assert.deepEqual(trichSdt('Ai nhận thì inbox nhé, sđt 0987 654 321 ạ'), ['0987654321']);
});

test('trichZalo bắt cả link zalo.me lẫn số đứng cạnh chữ zalo', () => {
  assert.deepEqual(trichZalo('Liên hệ zalo 0901234567'), ['0901234567']);
  assert.ok(trichZalo('https://zalo.me/0901234567').length === 1);
});

test('trichEmail chuẩn hoá về chữ thường và bỏ trùng', () => {
  assert.deepEqual(trichEmail('Gửi CV về A@Shop.VN hoặc a@shop.vn'), ['a@shop.vn']);
});

test('trichLienHe xếp đúng mức độ chạm được', () => {
  assert.equal(trichLienHe('LH 0901234567').mucDo, 'truc_tiep');
  assert.equal(trichLienHe('Gửi mail ve a@b.com').mucDo, 'gian_tiep');
  assert.equal(trichLienHe('Comment bên dưới nhé').mucDo, 'khong_co');
});

// ---------- Ngân sách ----------
test('docNganSach đọc được khoảng tiền có gạch nối', () => {
  const r = docNganSach('Ngân sách 5-10tr/tháng');
  assert.equal(r.loai, 'khoang');
  assert.equal(r.min, 5_000_000);
  assert.equal(r.max, 10_000_000);
});

test('docNganSach đọc các đơn vị rút gọn kiểu Việt', () => {
  assert.equal(docNganSach('Budget 500k/video').min, 500_000);
  assert.equal(docNganSach('giá 1.5 triệu').min, 1_500_000);
  assert.equal(docNganSach('trả 10 củ').min, 10_000_000);
  assert.equal(docNganSach('Lương 5.000.000đ').min, 5_000_000);
});

test('docNganSach ghi nhận USD mà KHÔNG tự quy đổi tỷ giá', () => {
  const r = docNganSach('Budget $500 - $800');
  assert.equal(r.tienTe, 'USD');
  assert.equal(r.min, 500);
  assert.equal(r.max, 800);
});

test('docNganSach phân biệt thoả thuận với không nêu', () => {
  assert.equal(docNganSach('Lương thoả thuận theo năng lực').loai, 'thoa_thuan');
  assert.equal(docNganSach('Cần người làm content').loai, 'khong_neu');
});

// ---------- Nhu cầu ----------
test('phanLoaiNhuCau nhận diện mảng quay dựng', () => {
  const r = phanLoaiNhuCau('Cần bạn quay dựng video TikTok cho shop');
  assert.ok(r.nhuCau.includes('video'));
  assert.equal(r.ngoaiPhamVi.length, 0);
});

test('phanLoaiNhuCau nhận diện nhu cầu NGOÀI phạm vi dịch vụ', () => {
  const r = phanLoaiNhuCau('Tuyển lập trình viên backend NodeJS');
  assert.equal(r.nhuCau.length, 0);
  assert.ok(r.ngoaiPhamVi.length > 0);
});

test('suyRaHinhThuc phân biệt retainer / dự án / tuyển in-house', () => {
  assert.equal(suyRaHinhThuc('hợp tác lâu dài hàng tháng'), 'retainer');
  assert.equal(suyRaHinhThuc('cần freelance làm dự án này'), 'freelance'); // ưu tiên freelancer
  assert.equal(suyRaHinhThuc('tuyển nhân viên full time làm việc tại văn phòng'), 'tuyen_dung');
  assert.equal(suyRaHinhThuc('cần người hỗ trợ'), 'khong_ro');
});

test('doanKhuVuc đọc được cả tên viết tắt lẫn tên quận', () => {
  assert.equal(doanKhuVuc('Shop ở quận Bình Thạnh'), 'TP.HCM');
  assert.equal(doanKhuVuc('Văn phòng tại Cầu Giấy, Hà Nội'), 'Hà Nội');
  assert.equal(doanKhuVuc('làm remote thoải mái'), 'Remote');
  assert.equal(doanKhuVuc('không đề cập'), 'Không rõ');
});

// ---------- Độ tươi ----------
test('tinhTuoiGio và diemDoTuoi dốc mạnh trong 6 giờ đầu', () => {
  const now = new Date('2026-08-09T12:00:00Z');
  assert.equal(tinhTuoiGio(new Date('2026-08-09T11:00:00Z'), now), 1);
  assert.equal(diemDoTuoi(1), 25);
  assert.equal(diemDoTuoi(5), 21);
  assert.equal(diemDoTuoi(30), 8);
  assert.equal(diemDoTuoi(200), 1);
});

test('không rõ thời điểm đăng thì không thưởng cũng không phạt nặng', () => {
  assert.equal(tinhTuoiGio(null), null);
  assert.equal(diemDoTuoi(null), 6);
  assert.equal(diemDoTuoi(-5), 6); // dữ liệu sai (tương lai)
});

test('conHan mặc định KHÔNG loại lead khi thiếu dữ liệu hạn', () => {
  const now = new Date('2026-08-09T12:00:00Z');
  assert.equal(conHan(null, now), true);
  assert.equal(conHan('khong-phai-ngay', now), true);
  assert.equal(conHan(new Date('2026-08-09T18:00:00Z'), now), true);
  assert.equal(conHan(new Date('2026-08-09T06:00:00Z'), now), false);
});

test('tinhHetHan cộng TTL vào thời điểm đăng', () => {
  const het = tinhHetHan('2026-08-09T00:00:00Z', 48);
  assert.equal(het.toISOString(), '2026-08-11T00:00:00.000Z');
});
