#!/usr/bin/env node
// mcp/server.js — demand-engine-mcp-server
//
// ============================================================================
// Cho phép bất kỳ MCP client nào (Claude Desktop, Cowork, Claude Code…) truy vấn
// và nạp lead của Demand Engine.
//
// QUYẾT ĐỊNH THIẾT KẾ QUAN TRỌNG — server này CỐ Ý KHÔNG có công cụ đổi trạng thái
// lead (quan tâm / đã liên hệ / bỏ). Nguyên tắc xuyên suốt dự án là "máy đề xuất,
// người bấm". Nếu để agent tự đặt trạng thái thì nguyên tắc đó mất. Ghi vào hệ thống
// chỉ có MỘT đường: demand_ingest_lead → demand_inbox, và vẫn cần người bấm
// "Nạp lead mới" trên giao diện mới vào bảng chính.
//
// Viết bằng JS thuần thay vì TypeScript như skill khuyến nghị — có lý do: repo này
// không có build step (kế thừa nguyên tắc từ CMCTS), và server cần import trực tiếp
// src/core/*.js. Đánh đổi: mất kiểm tra kiểu tĩnh, bù lại bằng Zod validate mọi đầu vào.
//
// Transport: stdio (dùng cục bộ, một người). KHÔNG log ra stdout — stdout là kênh giao thức.
// ============================================================================

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { napLead } from '../src/core/nap-lead.js';
import { conHan, tinhTuoiGio, nhanDoTuoi } from '../src/core/tuoi.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_ANON_KEY;

const log = (...a) => console.error('[demand-engine-mcp]', ...a); // stderr, không phải stdout

// --------------------------------------------------------------- Supabase
async function pg(duongDan) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      'Chưa cấu hình SUPABASE_URL và SUPABASE_SERVICE_KEY. Đặt chúng trong biến môi trường của MCP client.',
    );
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${duongDan}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: 'count=exact',
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text.slice(0, 200)}`);
  const total = Number(res.headers.get('content-range')?.split('/')?.[1] ?? NaN);
  return { data: text ? JSON.parse(text) : [], total: Number.isFinite(total) ? total : null };
}

async function pgGhi(duongDan, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${duongDan}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

// ------------------------------------------------------------------ tiện ích
const loi = (msg, goiY) => ({
  isError: true,
  content: [{ type: 'text', text: goiY ? `Lỗi: ${msg}\nGợi ý: ${goiY}` : `Lỗi: ${msg}` }],
});

const traVe = (dinhDang, doiTuong, markdown) =>
  dinhDang === 'json'
    ? { content: [{ type: 'text', text: JSON.stringify(doiTuong, null, 2) }], structuredContent: doiTuong }
    : { content: [{ type: 'text', text: markdown }], structuredContent: doiTuong };

const DINH_DANG = z.enum(['markdown', 'json']).default('markdown')
  .describe('markdown cho người đọc, json cho xử lý bằng máy');

function moTaLead(l) {
  const tuoi = tinhTuoiGio(l.posted_at);
  const lh = l.contact_zalo ? `Zalo ${l.contact_zalo}` : l.contact_phone || l.contact_email || l.contact_url || '⚠ chưa có';
  return [
    `### [${l.tier ?? '?'}·${l.score ?? '?'}] ${l.title ?? '(không tiêu đề)'}`,
    `- Nguồn: ${l.source} · Khu vực: ${l.khu_vuc ?? 'không rõ'} · Hình thức: ${l.hinh_thuc ?? 'không rõ'}`,
    `- Nhu cầu: ${(l.nhu_cau ?? []).join(', ') || 'không rõ'}`,
    `- Ngân sách: ${l.budget_text ?? 'không nêu'}`,
    `- Liên hệ: ${lh}`,
    `- Đăng: ${nhanDoTuoi(tuoi)} · ${conHan(l.expires_at) ? 'còn hạn' : '**đã hết hạn**'}`,
    l.auto_notes ? `- ${l.auto_notes}` : null,
    l.source_url ? `- ${l.source_url}` : null,
  ].filter(Boolean).join('\n');
}

// ------------------------------------------------------------------- server
const server = new McpServer({ name: 'demand-engine-mcp-server', version: '0.1.0' });

// 1 ------------------------------------------------------ demand_search_leads
server.registerTool(
  'demand_search_leads',
  {
    title: 'Tìm lead',
    description:
      'Tìm lead nhu cầu Marketing/branding/social đã thu thập, lọc theo hạng, nguồn, nhu cầu, trạng thái và độ tươi. Trả về danh sách có phân trang.',
    inputSchema: {
      tier: z.array(z.enum(['A', 'B', 'C', 'D'])).optional().describe('Lọc theo hạng, ví dụ ["A","B"]'),
      source: z.string().optional().describe('Mã nguồn, ví dụ "vlance", "fb_manual"'),
      nhu_cau: z.enum(['content', 'video', 'design', 'branding', 'ads', 'sales', 'community', 'pr', 'event'])
        .optional().describe('Lọc theo nhóm nhu cầu'),
      chi_con_han: z.boolean().default(true).describe('Chỉ lấy lead chưa quá hạn dùng'),
      chua_lien_he: z.boolean().default(false).describe('Chỉ lấy lead chưa có trạng thái xử lý'),
      diem_toi_thieu: z.number().int().min(0).max(100).optional(),
      limit: z.number().int().min(1).max(100).default(20),
      offset: z.number().int().min(0).default(0),
      response_format: DINH_DANG,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async (a) => {
    try {
      const dk = ['select=*', `limit=${a.limit}`, `offset=${a.offset}`, 'order=score.desc'];
      if (a.tier?.length) dk.push(`tier=in.(${a.tier.join(',')})`);
      if (a.source) dk.push(`source=eq.${encodeURIComponent(a.source)}`);
      if (a.nhu_cau) dk.push(`nhu_cau=cs.{${a.nhu_cau}}`);
      if (a.chi_con_han) dk.push(`or=(expires_at.gt.${new Date().toISOString()},expires_at.is.null)`);
      if (a.chua_lien_he) dk.push('status=is.null');
      if (a.diem_toi_thieu != null) dk.push(`score=gte.${a.diem_toi_thieu}`);

      const { data, total } = await pg(`demand_leads?${dk.join('&')}`);
      const kq = {
        total, count: data.length, offset: a.offset,
        has_more: total != null ? a.offset + data.length < total : data.length === a.limit,
        next_offset: a.offset + data.length,
        items: data,
      };
      const md = data.length
        ? `Tìm thấy ${total ?? data.length} lead, hiển thị ${data.length}.\n\n${data.map(moTaLead).join('\n\n')}` +
          (kq.has_more ? `\n\n_Còn nữa — gọi lại với offset=${kq.next_offset}._` : '')
        : 'Không có lead nào khớp bộ lọc. Nếu bảng còn trống thì chưa có scraper nào chạy — dùng demand_ingest_lead để nạp tay.';
      return traVe(a.response_format, kq, md);
    } catch (e) {
      return loi(e.message, 'Kiểm tra SUPABASE_URL/SUPABASE_SERVICE_KEY, hoặc nới bộ lọc.');
    }
  },
);

// 2 --------------------------------------------------------- demand_get_lead
server.registerTool(
  'demand_get_lead',
  {
    title: 'Xem chi tiết một lead',
    description: 'Lấy toàn bộ thông tin một lead theo id (uuid) hoặc lead_key, gồm phân rã điểm và nội dung gốc.',
    inputSchema: {
      id: z.string().optional().describe('uuid của lead'),
      lead_key: z.string().optional().describe('khoá định danh đã chuẩn hoá, ví dụ "vlance.vn/du-an/abc"'),
      response_format: DINH_DANG,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async (a) => {
    if (!a.id && !a.lead_key) return loi('Cần id hoặc lead_key', 'Dùng demand_search_leads để tìm id trước.');
    try {
      const dk = a.id ? `id=eq.${a.id}` : `lead_key=eq.${encodeURIComponent(a.lead_key)}`;
      const { data } = await pg(`demand_leads?${dk}&select=*&limit=1`);
      if (!data.length) return loi('Không tìm thấy lead', 'Kiểm tra lại id/lead_key bằng demand_search_leads.');
      const l = data[0];
      const bd = l.score_breakdown ?? {};
      const md = `${moTaLead(l)}\n\n**Phân rã điểm**\n${Object.entries(bd).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n\n**Nội dung gốc**\n\n${l.raw_text ?? '(trống)'}`;
      return traVe(a.response_format, l, md);
    } catch (e) {
      return loi(e.message);
    }
  },
);

// 3 ------------------------------------------------------- demand_score_text
server.registerTool(
  'demand_score_text',
  {
    title: 'Chấm điểm một mẩu tin (không lưu)',
    description:
      'Chấm một bài đăng/tin tuyển bằng đúng rubric 100 điểm của hệ thống và trả về hạng, phân rã điểm, nhu cầu, liên hệ, ngân sách đã bóc tách. KHÔNG ghi vào cơ sở dữ liệu — dùng để thử trước khi quyết định nạp.',
    inputSchema: {
      noi_dung: z.string().min(20).describe('Nội dung bài đăng (text hoặc markdown)'),
      tieu_de: z.string().optional(),
      url: z.string().optional().describe('Link bài gốc, nếu có'),
      posted_at: z.string().optional().describe('Thời điểm đăng dạng ISO. Bỏ trống thì coi như vừa đăng.'),
      source: z.string().default('fb_manual'),
      response_format: DINH_DANG,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async (a) => {
    const r = napLead({
      source: a.source, url: a.url, noiDung: a.noi_dung, tieuDe: a.tieu_de,
      postedAt: a.posted_at ?? new Date().toISOString(),
    });
    if (!r.hopLe) return loi(r.lyDo, 'Nội dung cần ít nhất 20 ký tự và phải có mã nguồn.');
    const p = r.payload;
    const kq = {
      tier: p.tier, score: p.score, breakdown: p.score_breakdown,
      nhu_cau: p.nhu_cau, hinh_thuc: p.hinh_thuc, khu_vuc: p.khu_vuc,
      lien_he: { phone: p.contact_phone, zalo: p.contact_zalo, email: p.contact_email },
      ngan_sach: { text: p.budget_text, min: p.budget_min, max: p.budget_max },
      canh_bao: r.ketQua.canhBao, lead_key: p.lead_key,
    };
    const md = [
      `## Hạng ${p.tier} — ${p.score}/100`,
      `**${p.title ?? '(không tiêu đề)'}**`,
      '',
      '| Trục | Điểm |', '|---|---|',
      ...Object.entries(p.score_breakdown ?? {}).map(([k, v]) => `| ${k} | ${v} |`),
      '',
      `- Nhu cầu: ${p.nhu_cau.join(', ') || 'không nhận ra'}`,
      `- Hình thức: ${p.hinh_thuc} · Khu vực: ${p.khu_vuc}`,
      `- Liên hệ: ${p.contact_zalo ?? p.contact_phone ?? p.contact_email ?? '⚠ không tìm thấy'}`,
      `- Ngân sách: ${p.budget_text ?? 'không nêu'}`,
      r.ketQua.canhBao.length ? `- ⚠ Cảnh báo: ${r.ketQua.canhBao.join(', ')}` : '',
    ].filter(Boolean).join('\n');
    return traVe(a.response_format, kq, md);
  },
);

// 4 ----------------------------------------------------- demand_ingest_lead
server.registerTool(
  'demand_ingest_lead',
  {
    title: 'Nạp lead vào hàng đợi',
    description:
      'Chấm điểm rồi đẩy một hoặc nhiều lead vào demand_inbox. LƯU Ý: lead chỉ nằm ở hàng đợi — người dùng vẫn phải bấm "Nạp lead mới" trên giao diện để đưa vào bảng chính. Công cụ này KHÔNG đổi trạng thái lead nào đang có.',
    inputSchema: {
      leads: z.array(z.object({
        noi_dung: z.string().min(20),
        url: z.string().optional(),
        tieu_de: z.string().optional(),
        posted_at: z.string().optional(),
        source: z.string().default('fb_manual'),
      })).min(1).max(50).describe('Tối đa 50 lead mỗi lần'),
      response_format: DINH_DANG,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  async (a) => {
    try {
      const payloads = [];
      const boQua = [];
      for (const m of a.leads) {
        const r = napLead({
          source: m.source, url: m.url, noiDung: m.noi_dung, tieuDe: m.tieu_de,
          postedAt: m.posted_at ?? new Date().toISOString(), sourceQuery: 'mcp',
        });
        r.hopLe ? payloads.push(r.payload) : boQua.push({ tieu_de: m.tieu_de ?? null, ly_do: r.lyDo });
      }
      if (payloads.length) {
        await pgGhi('demand_inbox', [{ payload: payloads, run_label: `mcp-${new Date().toISOString().slice(0, 10)}` }]);
      }
      const kq = { da_nap: payloads.length, bo_qua: boQua, xem_truoc: payloads.map((p) => ({ tier: p.tier, score: p.score, title: p.title })) };
      const md = `Đã đẩy **${payloads.length}** lead vào hàng đợi${boQua.length ? `, bỏ ${boQua.length}` : ''}.\n\n` +
        payloads.map((p) => `- [${p.tier}·${p.score}] ${p.title}`).join('\n') +
        (boQua.length ? `\n\nBỏ qua:\n${boQua.map((b) => `- ${b.ly_do}`).join('\n')}` : '') +
        '\n\n_Vẫn cần bấm "Nạp lead mới" trên giao diện để vào bảng chính._';
      return traVe(a.response_format, kq, md);
    } catch (e) {
      return loi(e.message, 'Cần SUPABASE_SERVICE_KEY để ghi. Khoá anon sẽ bị RLS chặn.');
    }
  },
);

// 5 ---------------------------------------------------- demand_list_sources
server.registerTool(
  'demand_list_sources',
  {
    title: 'Liệt kê nguồn',
    description: 'Liệt kê các nguồn đã khai báo kèm transport, trạng thái bật/tắt, TTL, lần quét cuối và ghi chú rủi ro ToS.',
    inputSchema: { chi_dang_bat: z.boolean().default(false), response_format: DINH_DANG },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async (a) => {
    try {
      const dk = ['select=*', 'order=ma'];
      if (a.chi_dang_bat) dk.push('dang_bat=eq.true');
      const { data } = await pg(`demand_sources?${dk.join('&')}`);
      const md = ['| Mã | Tên | Transport | Bật | TTL(h) | Quét cuối |', '|---|---|---|---|---|---|',
        ...data.map((s) => `| ${s.ma} | ${s.ten} | ${s.transport} | ${s.dang_bat ? '✅' : '❌'} | ${s.ttl_gio} | ${s.lan_quet_cuoi ?? '—'} |`),
      ].join('\n');
      return traVe(a.response_format, { count: data.length, items: data }, md);
    } catch (e) {
      return loi(e.message);
    }
  },
);

// 6 ----------------------------------------------------------- demand_stats
server.registerTool(
  'demand_stats',
  {
    title: 'Thống kê tổng quan',
    description: 'Đếm lead theo hạng, theo nguồn, số còn hạn, số sắp hết hạn trong 6 giờ, và số dòng đang chờ trong hàng đợi.',
    inputSchema: { response_format: DINH_DANG },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async (a) => {
    try {
      const now = new Date();
      const sau6h = new Date(now.getTime() + 6 * 3600e3).toISOString();
      const [tatCa, inbox] = await Promise.all([
        pg('demand_leads?select=tier,source,status,expires_at&limit=5000'),
        pg('demand_inbox?processed=eq.false&select=id'),
      ]);
      const ds = tatCa.data;
      const conHanDS = ds.filter((l) => conHan(l.expires_at, now));
      const dem = (arr, k) => arr.reduce((m, x) => ((m[x[k] ?? 'khong_ro'] = (m[x[k] ?? 'khong_ro'] ?? 0) + 1), m), {});
      const kq = {
        tong: ds.length,
        con_han: conHanDS.length,
        sap_het_han_6h: conHanDS.filter((l) => l.expires_at && l.expires_at < sau6h).length,
        chua_xu_ly: conHanDS.filter((l) => !l.status).length,
        theo_hang: dem(conHanDS, 'tier'),
        theo_nguon: dem(conHanDS, 'source'),
        inbox_cho_nap: inbox.data.length,
      };
      const md = [
        `**Tổng ${kq.tong} lead** · còn hạn ${kq.con_han} · sắp hết hạn trong 6h **${kq.sap_het_han_6h}** · chưa xử lý ${kq.chua_xu_ly}`,
        '', '**Theo hạng**', ...Object.entries(kq.theo_hang).map(([k, v]) => `- ${k}: ${v}`),
        '', '**Theo nguồn**', ...Object.entries(kq.theo_nguon).map(([k, v]) => `- ${k}: ${v}`),
        '', `Hàng đợi chờ nạp: ${kq.inbox_cho_nap} dòng`,
      ].join('\n');
      return traVe(a.response_format, kq, md);
    } catch (e) {
      return loi(e.message);
    }
  },
);

// ---------------------------------------------------------------------- chạy
const transport = new StdioServerTransport();
await server.connect(transport);
log('đã sẵn sàng — 6 công cụ, transport stdio');
