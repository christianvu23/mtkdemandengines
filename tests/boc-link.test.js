import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bocLinkBai, layTatCaLink, khuonDuongDan, doanDuongDan } from '../src/core/boc-link.js';

const URL_DS = 'https://www.vlance.vn/viec-lam-freelance/cpath_cac-cong-viec-marketing-kinh-doanh';

// Trang danh sách giả lập theo đúng hình dạng thật: vài link điều hướng lẫn với
// nhiều link bài cùng khuôn. Đây là hình dạng mà bocLinkBai phải tách đúng.
const TRANG_MD = `
[Trang chủ](https://www.vlance.vn/)
[Đăng nhập](https://www.vlance.vn/dang-nhap)
[Giới thiệu](https://www.vlance.vn/gioi-thieu)
[Tìm freelancer](https://www.vlance.vn/freelancers)

## Việc mới nhất
- [Cần quay dựng video TikTok cho shop mỹ phẩm](https://www.vlance.vn/du-an/quay-dung-video-tiktok-shop-my-pham-91234)
- [Thiết kế bộ nhận diện thương hiệu](https://www.vlance.vn/du-an/thiet-ke-bo-nhan-dien-thuong-hieu-91235)
- [Viết content fanpage spa](https://www.vlance.vn/du-an/viet-content-fanpage-spa-91236)
- [Chạy ads Facebook cho quán cafe](https://www.vlance.vn/du-an/chay-ads-facebook-quan-cafe-91237)

[Trang 2](https://www.vlance.vn/viec-lam-freelance?page=2)
[Chính sách](https://www.vlance.vn/quy-che-hoat-dong)
![logo](https://www.vlance.vn/static/logo.png)
[Site khác](https://freelancerviet.vn/viec-lam-freelance)
`;

test('layTatCaLink bắt được cả markdown, href và URL trần', () => {
  const links = layTatCaLink(
    'Xem [ở đây](https://a.vn/x) và <a href="/y">y</a> và https://a.vn/z trần',
    'https://a.vn/goc',
  );
  assert.ok(links.includes('https://a.vn/x'));
  assert.ok(links.includes('https://a.vn/y'), 'link tương đối phải được nối với urlGoc');
  assert.ok(links.includes('https://a.vn/z'));
});

test('layTatCaLink bỏ mailto/tel/javascript', () => {
  const links = layTatCaLink('[mail](mailto:a@b.vn) [gọi](tel:0901234567) [js](javascript:void(0))', 'https://a.vn');
  assert.equal(links.length, 0);
});

test('khuonDuongDan gom slug và id về ký hiệu chung', () => {
  assert.equal(khuonDuongDan('https://a.vn/du-an/thiet-ke-logo-12345'), '/du-an/:slug');
  assert.equal(khuonDuongDan('https://a.vn/viec/8899'), '/viec/:id');
  assert.equal(khuonDuongDan('https://a.vn/gioi-thieu'), '/gioi-thieu');
});

test('doanDuongDan bỏ query và fragment', () => {
  assert.deepEqual(doanDuongDan('https://a.vn/x/y?z=1#top'), ['x', 'y']);
});

// ---------- Trọng tâm: suy luận khuôn ----------
test('tách đúng 4 link bài, bỏ hết link điều hướng', () => {
  const r = bocLinkBai(TRANG_MD, URL_DS);
  assert.equal(r.cachChon, 'suy_luan_theo_khuon');
  assert.equal(r.khuon, '/du-an/:slug');
  assert.equal(r.links.length, 4);
  assert.ok(r.links.every((u) => u.includes('/du-an/')));
});

test('không lẫn link sang host khác', () => {
  const r = bocLinkBai(TRANG_MD, URL_DS);
  assert.ok(!r.links.some((u) => u.includes('freelancerviet')));
});

test('không lẫn trang đăng nhập, giới thiệu, chính sách, phân trang', () => {
  const r = bocLinkBai(TRANG_MD, URL_DS);
  const xau = ['dang-nhap', 'gioi-thieu', 'quy-che', 'page=2', 'freelancers'];
  for (const x of xau) assert.ok(!r.links.some((u) => u.includes(x)), `lọt link chứa "${x}"`);
});

test('không lẫn file ảnh/tĩnh', () => {
  const r = bocLinkBai(TRANG_MD, URL_DS);
  assert.ok(!r.links.some((u) => /\.(png|css|js)$/.test(u)));
});

test('trang không đủ tín hiệu thì báo rõ thay vì đoán bừa', () => {
  const r = bocLinkBai('[a](https://a.vn/x-1234567) [b](https://a.vn/gioi-thieu)', 'https://a.vn/ds');
  assert.equal(r.cachChon, 'khong_du_tin_hieu');
  assert.equal(r.links.length, 0);
  assert.ok(r.thongKe.nhomLonNhat < 3);
});

test('regex khai báo được ưu tiên hơn suy luận', () => {
  const r = bocLinkBai(TRANG_MD, URL_DS, { regexBatBuoc: 'vlance\\.vn/du-an/[a-z0-9-]+' });
  assert.equal(r.cachChon, 'regex_khai_bao');
  assert.equal(r.links.length, 4);
});

test('regex sai cú pháp không làm sập, báo lỗi rõ', () => {
  const r = bocLinkBai(TRANG_MD, URL_DS, { regexBatBuoc: '[' });
  assert.equal(r.cachChon, 'regex_sai_cu_phap');
  assert.equal(r.links.length, 0);
});

test('trần số lượng được tôn trọng', () => {
  const nhieu = Array.from({ length: 60 }, (_, i) =>
    `[bai ${i}](https://www.vlance.vn/du-an/cong-viec-marketing-so-${1000 + i})`).join('\n');
  const r = bocLinkBai(nhieu, URL_DS, { tran: 10 });
  assert.equal(r.links.length, 10);
});

test('link trùng nhau chỉ tính một lần', () => {
  const lap = Array(5).fill('[x](https://www.vlance.vn/du-an/cung-mot-bai-99999)').join('\n')
    + '\n[y](https://www.vlance.vn/du-an/bai-khac-99998)'
    + '\n[z](https://www.vlance.vn/du-an/bai-nua-99997)';
  const r = bocLinkBai(lap, URL_DS);
  assert.equal(r.links.length, 3, 'phải khử trùng');
});

test('URL danh sách sai định dạng được xử lý êm', () => {
  const r = bocLinkBai(TRANG_MD, 'không-phải-url');
  assert.equal(r.cachChon, 'url_danh_sach_sai');
  assert.equal(r.links.length, 0);
});

test('hoạt động với HTML thô, không chỉ markdown', () => {
  const html = `<ul>
    <li><a href="/du-an/quay-video-shop-11111">Quay video</a></li>
    <li><a href="/du-an/thiet-ke-banner-11112">Thiết kế</a></li>
    <li><a href="/du-an/viet-content-11113">Content</a></li>
    <li><a href="/dang-nhap">Đăng nhập</a></li>
  </ul>`;
  const r = bocLinkBai(html, URL_DS);
  assert.equal(r.links.length, 3);
  assert.equal(r.khuon, '/du-an/:slug');
});
