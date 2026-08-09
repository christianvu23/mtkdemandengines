#!/usr/bin/env node
/**
 * scripts/smoke.mjs — Kiểm tra hệ thống thật sau khi deploy.
 *
 *   node scripts/smoke.mjs https://mtkdemandengines.<subdomain>.workers.dev <DEMAND_TOKEN>
 *
 * Dừng ở bước hỏng đầu tiên. Tự dọn dữ liệu mẫu ở bước cuối.
 * KHÔNG cần cài gì thêm — chỉ dùng fetch có sẵn của Node 20+.
 */

import { napLead } from '../src/core/nap-lead.js';

const [, , BASE, TOKEN] = process.argv;
if (!BASE || !TOKEN) {
  console.error('Dùng: node scripts/smoke.mjs <url-worker> <DEMAND_TOKEN>');
  process.exit(2);
}

let buoc = 0;
const ok = (t, ghiChu = '') => console.log(`✅ ${++buoc}. ${t}${ghiChu ? ` — ${ghiChu}` : ''}`);
const hong = (t, chiTiet) => {
  console.error(`❌ ${++buoc}. ${t}\n   ${chiTiet}`);
  process.exit(1);
};

const goi = (duongDan, tuyChon = {}) =>
  fetch(`${BASE}${duongDan}`, {
    ...tuyChon,
    headers: { 'X-Demand-Token': TOKEN, 'Content-Type': 'application/json', ...(tuyChon.headers ?? {}) },
  });

// 1 — trang tĩnh
try {
  const r = await fetch(BASE);
  if (!r.ok) hong('Trang tĩnh', `HTTP ${r.status}`);
  const html = await r.text();
  if (!/Demand Engine/i.test(html)) hong('Trang tĩnh', 'Không thấy chuỗi "Demand Engine" — assets chưa lên?');
  ok('Trang tĩnh phục vụ được');
} catch (e) { hong('Trang tĩnh', e.message); }

// 2 — API phải chặn request thiếu token
try {
  const r = await fetch(`${BASE}/api/demand/trang-thai`);
  if (r.status !== 401) {
    hong('Bảo vệ API', `Mong 401 khi không có token, nhận ${r.status}. CỔNG NẠP ĐANG HỞ — sửa ngay.`);
  }
  ok('API từ chối request không có token');
} catch (e) { hong('Bảo vệ API', e.message); }

// 3 — đọc được nguồn
let soNguon = 0;
try {
  const r = await goi('/api/demand/trang-thai');
  const j = await r.json();
  if (!r.ok) hong('Trạng thái', j.loi ?? `HTTP ${r.status}`);
  if (!Array.isArray(j.nguon) || j.nguon.length === 0) {
    hong('Trạng thái', 'Không đọc được demand_sources — kiểm tra SUPABASE_URL / SUPABASE_SERVICE_KEY');
  }
  soNguon = j.nguon.length;
  ok('Đọc được demand_sources', `${soNguon} nguồn, ${j.inbox_cho_nap} dòng chờ trong hàng đợi`);
} catch (e) { hong('Trạng thái', e.message); }

// 4 — transport nào thật sự sống
try {
  const r = await goi('/api/demand/kiem-tra-transport');
  const j = await r.json();
  if (!r.ok) hong('Kiểm tra transport', j.loi ?? `HTTP ${r.status}`);
  const dong = Object.entries(j.ket_qua).map(([k, v]) => `${v.ok ? '✓' : '✗'} ${k}${v.ok ? '' : ` (${v.loi})`}`);
  console.log(`✅ ${++buoc}. Kiểm tra transport\n   ${dong.join('\n   ')}`);
  if (!j.ket_qua.truc_tiep?.ok) {
    console.warn('   ⚠ truc_tiep hỏng — bất thường, nó không cần credential nào.');
  }
  if (!j.ket_qua.browser_run?.ok && !j.ket_qua.unlocker?.ok) {
    console.warn('   ⚠ Cả browser_run lẫn unlocker đều hỏng → Hunter KHÔNG quét được vLance (403).');
  }
} catch (e) { hong('Kiểm tra transport', e.message); }

// 5 — nạp một lead mẫu, đối chiếu với chấm điểm offline
const DAU_HIEU = `smoke-test-${Date.now()}`;
const MAU = `Shop mỹ phẩm cần bạn quay dựng video TikTok và thiết kế banner, khoảng 10 video mỗi tháng, `
  + `hợp tác lâu dài hàng tháng. Deadline cuối tuần này. Ngân sách 5-10tr/tháng. Zalo 0901234567. `
  + `Mã kiểm thử ${DAU_HIEU}`;

try {
  const mongDoi = napLead({
    source: 'fb_manual', noiDung: MAU, postedAt: new Date().toISOString(),
  });

  const r = await goi('/api/demand/nap', {
    method: 'POST',
    body: JSON.stringify({ source: 'fb_manual', noiDung: MAU }),
  });
  const j = await r.json();
  if (!r.ok) hong('Nạp lead mẫu', j.loi ?? `HTTP ${r.status}`);
  if (j.da_day_vao_inbox !== 1) hong('Nạp lead mẫu', `Mong đẩy 1 lead, nhận ${j.da_day_vao_inbox}. ${JSON.stringify(j.bo_qua)}`);

  const hangThat = j.xem_truoc[0]?.hang;
  if (hangThat !== mongDoi.payload.tier) {
    hong('Nạp lead mẫu',
      `Hạng lệch: worker trả "${hangThat}", chấm offline ra "${mongDoi.payload.tier}". `
      + 'Worker đang chạy phiên bản src/core khác với bản trên máy — deploy lại.');
  }
  ok('Nạp lead mẫu', `hạng ${hangThat}, điểm ${j.xem_truoc[0].diem}, khớp bản offline`);
} catch (e) { hong('Nạp lead mẫu', e.message); }

// 6 — lead mẫu có nằm trong hàng đợi không
try {
  const r = await goi('/api/demand/trang-thai');
  const j = await r.json();
  if (j.inbox_cho_nap < 1) hong('Kiểm hàng đợi', 'Lead vừa nạp không thấy trong demand_inbox');
  ok('Lead mẫu nằm trong hàng đợi', `${j.inbox_cho_nap} dòng chờ`);
} catch (e) { hong('Kiểm hàng đợi', e.message); }

console.log(`
──────────────────────────────────────────────
Smoke test PASS.

Còn một việc THỦ CÔNG, cố ý không tự động hoá:
  Lead mẫu (mã ${DAU_HIEU}) đang nằm trong demand_inbox.
  Nó CHƯA vào bảng chính — đúng nguyên tắc "máy đề xuất, người bấm".

  Dọn bằng SQL nếu không muốn giữ:
    delete from demand_inbox where payload::text like '%${DAU_HIEU}%';
──────────────────────────────────────────────`);
