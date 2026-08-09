// worker.js — Backend Demand Engine trên Cloudflare Workers.
//
// ============================================================================
// NGUYÊN TẮC GIỮ NGUYÊN TỪ CMCTS: MÁY ĐỀ XUẤT, NGƯỜI BẤM.
// Worker CHỈ đẩy lead vào demand_inbox. Nó KHÔNG gọi merge_demand_inbox().
// Việc nạp vào bảng chính vẫn do Christian bấm nút trên giao diện — vì hàm merge
// đòi JWT có quyền ghi, mà service_role thì auth.uid() rỗng. Đây là ràng buộc
// CÓ CHỦ Ý, không phải hạn chế kỹ thuật cần vá.
// ============================================================================

import { napNhieuLead } from './src/core/nap-lead.js';
import { bocLinkBai } from './src/core/boc-link.js';
import { lay, kiemTraTransport } from './src/transport/index.js';

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

const traLoi = (data, status = 200) =>
  new Response(JSON.stringify(data, null, 2), { status, headers: JSON_HEADERS });

/** Cổng nạp là điểm ghi công khai duy nhất — phải có khoá. */
function duocPhep(request, env) {
  if (!env.DEMAND_TOKEN) return { ok: false, loi: 'Worker chưa cấu hình DEMAND_TOKEN' };
  const token = request.headers.get('X-Demand-Token') ?? new URL(request.url).searchParams.get('token');
  if (token !== env.DEMAND_TOKEN) return { ok: false, loi: 'Sai hoặc thiếu token' };
  return { ok: true };
}

// --------------------------------------------------------------- Supabase
async function sb(env, duongDan, { method = 'GET', body, prefer } = {}) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    throw new Error('Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_KEY');
  }
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${duongDan}`, {
    method,
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

const nhanPhien = (d = new Date()) => `agent-${d.toISOString().slice(0, 10)}`;

async function dayVaoInbox(env, payloads, runLabel) {
  if (!payloads.length) return null;
  return sb(env, 'demand_inbox', {
    method: 'POST',
    body: [{ payload: payloads, run_label: runLabel }],
    prefer: 'return=representation',
  });
}

async function ghiQueryLog(env, dong) {
  try {
    await sb(env, 'demand_query_log', { method: 'POST', body: [dong] });
  } catch (e) {
    console.log('Không ghi được query_log:', e.message); // không để lỗi phụ làm hỏng luồng chính
  }
}

// ------------------------------------------------------- POST /api/demand/nap
/**
 * Cổng nạp tay — trái tim của phương án 🅐.
 * Bạn đọc được bài trong nhóm Facebook/Zalo thì dán vào đây; máy lo chấm điểm,
 * chống trùng và nhắc hạn. Không scrape, không đụng ToS của ai.
 *
 * Body: { source?, url?, noiDung, tieuDe?, postedAt? }  hoặc  { leads: [...] }
 */
async function xuLyNap(request, env) {
  const than = await request.json().catch(() => null);
  if (!than) return traLoi({ loi: 'Body không phải JSON hợp lệ' }, 400);

  const dsVao = Array.isArray(than.leads) ? than.leads : [than];
  const chuanHoa = dsVao.map((m) => ({
    source: m.source || 'fb_manual',
    url: m.url ?? null,
    noiDung: m.noiDung ?? m.text ?? m.raw_text ?? '',
    tieuDe: m.tieuDe ?? m.title ?? null,
    postedAt: m.postedAt ?? m.posted_at ?? new Date().toISOString(),
    sourceQuery: 'nap_tay',
  }));

  const { payloads, boQua, tongVao } = napNhieuLead(chuanHoa);
  const runLabel = nhanPhien();

  if (payloads.length) await dayVaoInbox(env, payloads, runLabel);
  await ghiQueryLog(env, {
    query: 'nap_tay', method: 'nap_tay', source: chuanHoa[0]?.source ?? 'fb_manual',
    run_label: runLabel, so_lead_moi: payloads.length, created_by: 'worker',
    ghi_chu: boQua.length ? `Bỏ ${boQua.length}: ${boQua.map((b) => b.lyDo).join('; ').slice(0, 200)}` : null,
  });

  return traLoi({
    tong_vao: tongVao,
    da_day_vao_inbox: payloads.length,
    bo_qua: boQua,
    run_label: runLabel,
    xem_truoc: payloads.map((p) => ({
      tieu_de: p.title, hang: p.tier, diem: p.score,
      nhu_cau: p.nhu_cau, lien_he: p.contact_zalo ?? p.contact_phone ?? p.contact_email ?? null,
      ngan_sach: p.budget_text, canh_bao: p.auto_notes,
    })),
    buoc_tiep: 'Mở giao diện và bấm "Nạp lead mới" để đưa vào bảng chính — máy không tự làm thay bạn.',
  });
}

// ------------------------------------------------------ POST /api/demand/quet
/**
 * Hunter — phương án 🅑. Quét các nguồn đang bật, không phải nap_tay.
 *
 * Tách link bài bằng SUY LUẬN THEO KHUÔN đường dẫn (src/core/boc-link.js), nên
 * không cần khai regex trước cho từng nguồn. Nguồn nào đã biết khuôn thật thì
 * điền `cau_hinh.regex_link_bai` và nó được ưu tiên hơn suy luận.
 *
 * ⚠️ CHƯA chạy trên HTML thật của vLance/FreelancerViet (phiên xây dựng bị 403).
 * Lần chạy đầu phải xem trường `cach_tach_link` và `khuon` trong kết quả trả về
 * để xác nhận nó bắt đúng thứ cần bắt.
 */
async function xuLyQuet(request, env) {
  const url = new URL(request.url);
  const chiNguon = url.searchParams.get('nguon');

  let dk = 'dang_bat=eq.true&transport=neq.nap_tay&select=*';
  if (chiNguon) dk += `&ma=eq.${encodeURIComponent(chiNguon)}`;
  const nguonList = await sb(env, `demand_sources?${dk}`);

  const runLabel = nhanPhien();
  const ketQua = [];

  for (const ng of nguonList) {
    const urlDS = ng.cau_hinh?.url_danh_sach;
    if (!urlDS) { ketQua.push({ nguon: ng.ma, bo_qua: 'chưa cấu hình url_danh_sach' }); continue; }

    const kq = await lay(urlDS, ng.transport, env);
    if (!kq.ok) {
      ketQua.push({ nguon: ng.ma, loi: kq.loi });
      await sb(env, `demand_sources?ma=eq.${ng.ma}`, {
        method: 'PATCH',
        body: { lan_loi_cuoi: new Date().toISOString(), so_loi_lien_tiep: (ng.so_loi_lien_tiep ?? 0) + 1 },
      });
      continue;
    }

    // Tách link bài: suy luận theo khuôn đường dẫn, KHÔNG cần regex khai trước.
    // Nguồn nào đã biết khuôn thật thì cau_hinh.regex_link_bai sẽ được ưu tiên.
    const boc = bocLinkBai(kq.noiDung, urlDS, {
      regexBatBuoc: ng.cau_hinh?.regex_link_bai ?? null,
      tran: ng.tran_lead_moi_dot ?? 40,
    });
    const links = boc.links;

    if (!links.length) {
      ketQua.push({ nguon: ng.ma, bo_qua: `không tách được link bài (${boc.cachChon})`, thong_ke: boc.thongKe });
      await ghiQueryLog(env, {
        query: urlDS, method: ng.transport, source: ng.ma, run_label: runLabel,
        so_lead_moi: 0, ghi_chu: `Không tách được link: ${boc.cachChon}`, created_by: 'worker',
      });
      continue;
    }

    const thoDS = [];
    for (const link of links) {
      const ct = await lay(link, ng.transport, env);
      if (ct.ok) {
        thoDS.push({ source: ng.ma, url: link, noiDung: ct.noiDung, sourceQuery: urlDS });
      }
    }

    const { payloads, boQua } = napNhieuLead(thoDS);
    if (payloads.length) await dayVaoInbox(env, payloads, runLabel);

    await sb(env, `demand_sources?ma=eq.${ng.ma}`, {
      method: 'PATCH',
      body: { lan_quet_cuoi: new Date().toISOString(), so_loi_lien_tiep: 0 },
    });
    await ghiQueryLog(env, {
      query: urlDS, method: ng.transport, source: ng.ma, run_label: runLabel,
      so_lead_moi: payloads.length, ghi_chu: `${links.length} link (${boc.cachChon} ${boc.khuon ?? ''}), bỏ ${boQua.length}`, created_by: 'worker',
    });

    ketQua.push({ nguon: ng.ma, transport: kq.nguon, da_lui: !!kq.daLui,
      cach_tach_link: boc.cachChon, khuon: boc.khuon, so_link: links.length, so_lead: payloads.length });
  }

  return traLoi({ run_label: runLabel, ket_qua: ketQua });
}

// -------------------------------------------------------------------- routes
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;

    if (!p.startsWith('/api/')) {
      return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
    }

    const quyen = duocPhep(request, env);
    if (!quyen.ok) return traLoi({ loi: quyen.loi }, 401);

    try {
      if (p === '/api/demand/nap' && request.method === 'POST') return await xuLyNap(request, env);
      if (p === '/api/demand/quet' && request.method === 'POST') return await xuLyQuet(request, env);

      if (p === '/api/demand/kiem-tra-transport') {
        return traLoi({
          ghi_chu: 'Chạy cái này MỘT LẦN sau khi nạp secret. Đừng tin transport chưa từng chạy.',
          ket_qua: await kiemTraTransport(env),
        });
      }

      if (p === '/api/demand/trang-thai') {
        const [nguon, inbox] = await Promise.all([
          sb(env, 'demand_sources?select=ma,ten,transport,dang_bat,lan_quet_cuoi,so_loi_lien_tiep'),
          sb(env, 'demand_inbox?processed=eq.false&select=id,run_label,created_at'),
        ]);
        return traLoi({ nguon, inbox_cho_nap: inbox.length, chi_tiet_inbox: inbox });
      }

      return traLoi({ loi: 'Không có route này' }, 404);
    } catch (e) {
      return traLoi({ loi: String(e?.message ?? e) }, 500);
    }
  },

  // Cron — chỉ bật sau khi kiem-tra-transport xanh và regex_link_bai đã điền
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      xuLyQuet(new Request('https://cron/api/demand/quet'), env).catch((e) =>
        console.log('Cron quét lỗi:', e.message),
      ),
    );
  },
};
