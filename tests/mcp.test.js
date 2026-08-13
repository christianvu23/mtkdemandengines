import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Test tích hợp thật: chạy mcp/server.js như một tiến trình con qua stdio,
// nói chuyện bằng đúng giao thức MCP. Không mock.

const goc = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
let client;

before(async () => {
  client = new Client({ name: 'test-client', version: '0.0.1' });
  await client.connect(new StdioClientTransport({
    command: process.execPath,
    args: [path.join(goc, 'mcp', 'server.js')],
    // Cố ý KHÔNG cấp credential Supabase — để kiểm tra công cụ thuần vẫn chạy
    // và công cụ cần CSDL báo lỗi tử tế thay vì sập.
    env: { PATH: process.env.PATH },
  }));
});

after(async () => { await client?.close(); });

test('server khai báo đủ 12 công cụ (6 demand_ + 6 browser_)', async () => {
  const { tools } = await client.listTools();
  const ten = tools.map((t) => t.name).sort();
  assert.deepEqual(ten, [
    'browser_click', 'browser_extract_content', 'browser_extract_links',
    'browser_navigate', 'browser_scrape_pipeline', 'browser_wait',
    'demand_get_lead', 'demand_ingest_lead', 'demand_list_sources',
    'demand_score_text', 'demand_search_leads', 'demand_stats',
  ]);
  assert.ok(tools.filter((t) => t.name.startsWith('demand_')).length === 6,
    'phải có đúng 6 công cụ demand_');
});

test('mọi công cụ đều có mô tả và annotations', async () => {
  const { tools } = await client.listTools();
  for (const t of tools) {
    assert.ok(t.description && t.description.length > 30, `${t.name} thiếu mô tả tử tế`);
    assert.ok(t.annotations, `${t.name} thiếu annotations`);
    assert.equal(typeof t.annotations.readOnlyHint, 'boolean');
  }
});

test('chỉ hai công cụ được phép ghi (demand_ingest_lead + browser_click) — giữ nguyên tắc máy đề xuất người bấm', async () => {
  const { tools } = await client.listTools();
  const ghi = tools.filter((t) => t.annotations?.readOnlyHint === false).map((t) => t.name).sort();
  assert.deepEqual(ghi, ['browser_click', 'demand_ingest_lead']);
  assert.ok(!tools.some((t) => /status|trang_thai|update/.test(t.name)),
    'KHÔNG được có công cụ đổi trạng thái lead');
});

test('demand_score_text chấm được bài thật mà không cần cơ sở dữ liệu', async () => {
  const r = await client.callTool({
    name: 'demand_score_text',
    arguments: {
      noi_dung: 'Shop mỹ phẩm cần bạn quay dựng video TikTok và thiết kế banner, khoảng 10 video mỗi tháng, '
        + 'hợp tác lâu dài hàng tháng. Deadline cuối tuần này. Ngân sách 5-10tr/tháng. Zalo 0901234567.',
      response_format: 'json',
    },
  });
  assert.ok(!r.isError, JSON.stringify(r));
  const kq = JSON.parse(r.content[0].text);
  assert.equal(kq.tier, 'A');
  assert.ok(kq.score >= 75);
  assert.equal(kq.lien_he.zalo, '0901234567');
  assert.equal(kq.ngan_sach.min, 5000000);
  assert.ok(kq.nhu_cau.includes('video'));
});

test('demand_score_text trả structuredContent chứ không chỉ text', async () => {
  const r = await client.callTool({
    name: 'demand_score_text',
    arguments: { noi_dung: 'Cần người chạy ads Facebook cho quán cafe mới khai trương, ngân sách 15tr. LH 0912345678' },
  });
  assert.ok(r.structuredContent, 'phải có structuredContent');
  assert.ok(['A', 'B', 'C', 'D'].includes(r.structuredContent.tier));
});

test('markdown là định dạng mặc định và đọc được', async () => {
  const r = await client.callTool({
    name: 'demand_score_text',
    arguments: { noi_dung: 'Tuyển bạn làm content cho fanpage spa, 8 bài mỗi tháng, hợp tác lâu dài. Zalo 0987654321' },
  });
  const text = r.content[0].text;
  assert.match(text, /## Hạng [ABCD] — \d+\/100/);
  assert.match(text, /\| Trục \| Điểm \|/);
});

test('đầu vào sai bị Zod chặn trước khi vào hàm', async () => {
  const r = await client.callTool({ name: 'demand_score_text', arguments: { noi_dung: 'ngắn' } });
  assert.ok(r.isError, 'nội dung dưới 20 ký tự phải bị từ chối');
});

test('công cụ cần CSDL báo lỗi có hướng dẫn thay vì sập server', async () => {
  const r = await client.callTool({ name: 'demand_stats', arguments: {} });
  assert.ok(r.isError);
  assert.match(r.content[0].text, /SUPABASE_URL/);
  // server vẫn sống sau lỗi
  const sau = await client.listTools();
  assert.equal(sau.tools.length, 12);
});

test('demand_search_leads khai báo đúng tham số phân trang', async () => {
  const { tools } = await client.listTools();
  const t = tools.find((x) => x.name === 'demand_search_leads');
  for (const k of ['limit', 'offset', 'response_format']) {
    assert.ok(k in t.inputSchema.properties, `thiếu tham số ${k}`);
  }
  assert.equal(t.inputSchema.properties.limit.maximum, 100);
});
