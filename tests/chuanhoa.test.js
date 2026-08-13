import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boDau, chuanHoaText, chuanHoaKey, khoaDuPhong, doTuongDong } from '../src/core/chuanhoa.js';

test('boDau xử lý đủ dấu tiếng Việt kể cả đ/Đ', () => {
  assert.equal(boDau('Đà Nẵng'), 'Da Nang');
  assert.equal(boDau('quay dựng'), 'quay dung');
  assert.equal(boDau('ƯU ĐÃI'), 'UU DAI');
});

test('chuanHoaText khớp hành vi hàm SQL dm_chuan_hoa_text', () => {
  // Giá trị đối chiếu lấy từ chính Postgres ngày 09/08/2026
  assert.equal(
    chuanHoaText('Cần tìm bạn QUAY DỰNG video TikTok cho shop mỹ phẩm!!! LH: 0901234567'),
    'can tim ban quay dung video tiktok cho shop my pham lh 0901234567',
  );
});

test('chuanHoaKey bỏ scheme, www và tham số theo dõi', () => {
  assert.equal(
    chuanHoaKey('https://www.vlance.vn/du-an/abc-123?utm_source=fb&fbclid=xyz/'),
    'vlance.vn/du-an/abc-123',
  );
  assert.equal(chuanHoaKey('HTTP://M.Facebook.com/groups/123/posts/456/'), 'facebook.com/groups/123/posts/456');
  assert.equal(chuanHoaKey('   '), null);
  assert.equal(chuanHoaKey(null), null);
});

test('chuanHoaKey bỏ open_from và search_id (tracking params của vieclam24h)', () => {
  assert.equal(
    chuanHoaKey('https://vieclam24h.vn/marketing/test-id123.html?open_from=0301&search_id=abc123&utm_source=google'),
    'vieclam24h.vn/marketing/test-id123.html',
  );
  assert.equal(
    chuanHoaKey('https://vieclam24h.vn/marketing/test-id123.html?search_id=xyz'),
    'vieclam24h.vn/marketing/test-id123.html',
  );
  assert.equal(
    chuanHoaKey('https://vieclam24h.vn/marketing/test-id123.html?open_from=0301'),
    'vieclam24h.vn/marketing/test-id123.html',
  );
});

test('hai URL cùng bài nhưng khác tracking phải ra cùng một khoá', () => {
  const a = chuanHoaKey('https://vlance.vn/du-an/x?utm_campaign=abc');
  const b = chuanHoaKey('http://www.vlance.vn/du-an/x/');
  assert.equal(a, b);
});

test('khoaDuPhong dùng được khi không có URL', () => {
  const k = khoaDuPhong('fb_group', 'Cần tuyển designer gấp cho shop');
  assert.match(k, /^fb_group:can-tuyen-designer-gap-cho-shop$/);
  assert.equal(khoaDuPhong('fb_group', '   '), null);
});

test('doTuongDong bắt được bài đăng lại có sửa nhẹ', () => {
  const goc = 'Cần tuyển designer gấp cho shop mỹ phẩm';
  assert.ok(doTuongDong(goc, 'cần tuyển designer gấp cho shop mỹ phẩm!!!') > 0.9);
  assert.ok(doTuongDong(goc, 'Tuyển kế toán tổng hợp tại Hà Nội') < 0.2);
  assert.equal(doTuongDong('', 'gì đó'), 0);
});
