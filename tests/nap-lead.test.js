import { test } from 'node:test';
import assert from 'node:assert/strict';
import { napLead, napNhieuLead, goMarkdown, goFrontmatter, sachUrlTheoDoi, doanTieuDe, doDoCanhTranh } from '../src/core/nap-lead.js';
import { nenThuLai, TRANSPORT_HOP_LE, layTuNapTay } from '../src/transport/index.js';

const NOW = new Date('2026-08-09T12:00:00Z');
const gioTruoc = (n) => new Date(NOW.getTime() - n * 3600e3).toISOString();

const BAI_FB = `Shop mỹ phẩm bên mình cần tìm bạn **quay dựng video TikTok** và thiết kế banner,
khoảng 10 video mỗi tháng, hợp tác lâu dài hàng tháng. Deadline lô đầu cuối tuần này.
Ngân sách 5-10tr/tháng tuỳ khối lượng. Liên hệ Zalo 0901234567 nhé.`;

// ---------- Tiện ích markdown ----------
test('goMarkdown giữ chữ, bỏ cú pháp, và giữ nhãn của link', () => {
  const md = '# Tiêu đề\n\n![anh](http://x/y.png)\nXem [chi tiết ở đây](https://a.vn/b) nhé\n\n- gạch đầu dòng';
  const t = goMarkdown(md);
  assert.ok(t.includes('Tiêu đề'));
  assert.ok(t.includes('chi tiết ở đây'), 'phải giữ nhãn link');
  assert.ok(!t.includes('https://a.vn/b'), 'phải bỏ URL trong link');
  assert.ok(!t.includes('!['), 'phải bỏ ảnh');
  assert.ok(!t.includes('#'));
});

test('goFrontmatter bỏ khối YAML frontmatter của browser_run', () => {
  const fm = '---\ntitle: "Tuyển nhân viên"\nmeta:\n description: "mô tả"\n keywords: "a,b"\n---\n\nNội dung thật của bài.';
  const t = goFrontmatter(fm);
  assert.ok(!t.includes('title:'), 'phải bỏ frontmatter');
  assert.ok(!t.includes('description:'), 'phải bỏ meta');
  assert.ok(t.includes('Nội dung thật của bài'), 'phải giữ nội dung');
});

test('goMarkdown cũng bỏ frontmatter để raw_text không còn meta tiếng Anh', () => {
  const fm = '---\ntitle: "X"\nmeta:\n og:description: "y"\n---\nNội dung.';
  const t = goMarkdown(fm);
  assert.ok(!t.includes('og:description'), 'raw_text phải sạch frontmatter');
  assert.ok(t.includes('Nội dung'));
});

test('sachUrlTheoDoi bỏ tham số tracking nhưng giữ URL gốc', () => {
  const u = sachUrlTheoDoi('https://vieclam24h.vn/viec-lam-abc-id123.html?open_from=0301_1_1&search_id=xyz');
  assert.equal(u, 'https://vieclam24h.vn/viec-lam-abc-id123.html');
  assert.equal(sachUrlTheoDoi('https://a.vn/b?utm_source=x'), 'https://a.vn/b');
  assert.equal(sachUrlTheoDoi('https://a.vn/b'), 'https://a.vn/b');
  assert.equal(sachUrlTheoDoi(null), null);
});

test('doanTieuDe ưu tiên heading, không có thì lấy câu đầu', () => {
  assert.equal(doanTieuDe('# Cần designer gấp\n\nnội dung'), 'Cần designer gấp');
  assert.equal(doanTieuDe('Cần designer gấp\nnội dung sau'), 'Cần designer gấp');
  assert.equal(doanTieuDe('bất kỳ', 'Tiêu đề cho sẵn'), 'Tiêu đề cho sẵn');
});

test('doDoCanhTranh phân biệt "không biết" với "chắc chắn chưa ai"', () => {
  assert.equal(doDoCanhTranh('Đã có 12 chào giá'), 12);
  assert.equal(doDoCanhTranh('8 ứng viên đã nộp'), 8);
  assert.equal(doDoCanhTranh('Không nhắc gì tới số lượng'), null); // null ≠ 0
});

// ---------- Nạp lead ----------
test('nạp một bài Facebook thật cho ra lead hạng cao, chạm được', () => {
  const r = napLead({ source: 'fb_manual', noiDung: BAI_FB, postedAt: gioTruoc(1) }, NOW);
  assert.equal(r.hopLe, true);
  assert.equal(r.payload.contact_zalo, '0901234567');
  assert.equal(r.payload.budget_min, 5_000_000);
  assert.equal(r.payload.budget_max, 10_000_000);
  assert.equal(r.payload.hinh_thuc, 'retainer');
  assert.ok(r.payload.nhu_cau.includes('video'));
  assert.ok(r.payload.score >= 75, `score=${r.payload.score}`);
  assert.equal(r.payload.tier, 'A');
});

test('không có URL vẫn dựng được khoá dedup từ nội dung', () => {
  const r = napLead({ source: 'fb_manual', noiDung: BAI_FB, postedAt: gioTruoc(1) }, NOW);
  assert.ok(r.payload.lead_key.startsWith('fb_manual:'));
});

test('cùng một bài đăng lại có sửa nhẹ vẫn ra cùng khoá dự phòng', () => {
  const a = napLead({ source: 'fb_manual', noiDung: BAI_FB }, NOW);
  const b = napLead({ source: 'fb_manual', noiDung: BAI_FB + '\n\n#tuyendung #freelance' }, NOW);
  assert.equal(a.payload.lead_key, b.payload.lead_key, 'khoá dự phòng lấy 120 ký tự đầu nên phải trùng');
});

test('có URL thì khoá lấy theo URL đã chuẩn hoá, không theo nội dung', () => {
  const r = napLead({ source: 'vlance', url: 'https://www.vlance.vn/du-an/abc?utm_source=fb', noiDung: BAI_FB }, NOW);
  assert.equal(r.payload.lead_key, 'vlance.vn/du-an/abc');
});

test('nội dung quá ngắn bị từ chối kèm lý do rõ ràng', () => {
  const r = napLead({ source: 'fb_manual', noiDung: 'cần designer' }, NOW);
  assert.equal(r.hopLe, false);
  assert.match(r.lyDo, /quá ngắn/);
});

test('thiếu mã nguồn bị từ chối', () => {
  assert.equal(napLead({ noiDung: BAI_FB }).hopLe, false);
});

test('markdown từ transport được xử lý giống hệt text thuần', () => {
  const md = `## Cần quay dựng video TikTok cho shop mỹ phẩm\n\n${BAI_FB}`;
  const r = napLead({ source: 'vlance', noiDung: md, postedAt: gioTruoc(1) }, NOW);
  assert.equal(r.hopLe, true);
  assert.match(r.payload.title, /quay dựng video TikTok/);
  assert.equal(r.payload.contact_zalo, '0901234567');
});

test('nạp lô tách rõ cái vào được và cái bị bỏ', () => {
  const kq = napNhieuLead([
    { source: 'fb_manual', noiDung: BAI_FB, postedAt: gioTruoc(1) },
    { source: 'fb_manual', noiDung: 'ngắn quá' },
    { noiDung: BAI_FB },
  ], NOW);
  assert.equal(kq.tongVao, 3);
  assert.equal(kq.payloads.length, 1);
  assert.equal(kq.boQua.length, 2);
  assert.ok(kq.boQua.every((b) => typeof b.lyDo === 'string' && b.lyDo.length > 0));
});

test('payload khớp đúng các khoá mà merge_demand_inbox đọc', () => {
  const r = napLead({ source: 'fb_manual', noiDung: BAI_FB, postedAt: gioTruoc(1) }, NOW);
  for (const k of ['lead_key', 'source', 'title', 'raw_text', 'nhu_cau', 'hinh_thuc', 'score', 'tier']) {
    assert.ok(k in r.payload, `thiếu khoá ${k}`);
  }
  assert.ok(['du_an', 'retainer', 'tuyen_dung', 'khong_ro'].includes(r.payload.hinh_thuc));
  assert.ok(['A', 'B', 'C', 'D'].includes(r.payload.tier));
});

// ---------- Transport ----------
test('nenThuLai chỉ đúng với lỗi tạm thời', () => {
  assert.equal(nenThuLai(429), true);
  assert.equal(nenThuLai(503), true);
  assert.equal(nenThuLai(403), false, '403 của vLance là chặn bot — thử lại vô ích');
  assert.equal(nenThuLai(404), false);
});

test('transport nap_tay không gọi mạng và từ chối nội dung rỗng', () => {
  assert.equal(layTuNapTay('  ').ok, false);
  const ok = layTuNapTay('nội dung thật');
  assert.equal(ok.ok, true);
  assert.equal(ok.nguon, 'nap_tay');
});

test('danh sách transport khớp ràng buộc CHECK trong CSDL', () => {
  assert.deepEqual(TRANSPORT_HOP_LE, ['truc_tiep', 'browser_run', 'unlocker', 'nap_tay']);
});
