// worker.js — Backend Demand Engine trên Cloudflare Workers.
//
// ============================================================================
// NGUYÊN TẮC GIỮ NGUYÊN TỪ CMCTS: MÁY ĐỀ XUẤT, NGƯỜI BẤM.
// Worker CHỈ đẩy lead vào demand_inbox. Nó KHÔNG gọi merge_demand_inbox().
// Việc nạp vào bảng chính vẫn do Christian bấm nút trên giao diện — vì hàm merge
// đòi JWT có quyền ghi, mà service_role thì auth.uid() rỗng. Đây là ràng buộc
// CÓ CHỦ Ý, không phải hạn chế kỹ thuật cần vá.
//
// QUÉT = QUEUE, KHÔNG ĐỒNG BỘ: `/api/demand/quet` và cron chỉ LIỆT KÊ nguồn rồi
// đẩy vào Cloudflare Queue (binding QUEUE_QUET). Handler `queue()` xử lý từng
// nguồn; nguồn nào tách được link bài thì đẩy tiếp từng link thành job riêng.
// Lý do: trước đây quét tuần tự 40 link × browser_run 45s ≈ 30 phút trong một
// request — dễ vượt timeout của Worker. Queue tự lo concurrency và không bị chặn.
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
 * Hunter — phương án 🅑. KHÔNG quét đồng bộ nữa.
 *
 * Trước đây quét nguồn và từng link bài TUẦN TỰ ngay trong request → dễ vượt
 * timeout của Worker (40 link × browser_run 45s ≈ 30 phút, Worker chỉ cho vài
 * chục giây). Giờ request chỉ LIỆT KÊ nguồn đang bật rồi đẩy từng nguồn thành
 * một job vào Cloudflare Queue; handler `queue()` xử lý từng job, và khi tách
 * được link bài thì đẩy tiếp từng link thành job riêng — queue tự lo concurrency.
 *
 * Cron bật = scheduled() gọi đúng hàm xếp queue này, nên API và cron dùng chung
 * một đường. Hàm trả về ngay, không đợi quét xong.
 */
export function chuanBiMessageQuetNguon(nguonList, runLabel) {
  return (nguonList ?? [])
    .filter((ng) => ng.cau_hinh?.url_danh_sach)
    .map((ng) => ({
      loai: 'quet_nguon',
      run_label: runLabel,
      ma_nguon: ng.ma,
      transport: ng.transport,
      url_danh_sach: ng.cau_hinh.url_danh_sach,
      tran: ng.tran_lead_moi_dot ?? 40,
      regex_link_bai: ng.cau_hinh?.regex_link_bai ?? null,
      so_loi_lien_tiep: ng.so_loi_lien_tiep ?? 0,
    }));
}

/** Đọc danh sách nguồn đang bật rồi xếp từng nguồn vào queue. Trả về ngay. */
async function lenhQuet(env, chiNguon = null) {
  let dk = 'dang_bat=eq.true&transport=neq.nap_tay&select=*';
  if (chiNguon) dk += `&ma=eq.${encodeURIComponent(chiNguon)}`;
  const nguonList = await sb(env, `demand_sources?${dk}`);

  const runLabel = nhanPhien();
  const messages = chuanBiMessageQuetNguon(nguonList, runLabel);
  for (let i = 0; i < messages.length; i += 100) {
    await env.QUEUE_QUET.sendBatch(messages.slice(i, i + 100));
  }

  const biBo = (nguonList ?? [])
    .filter((ng) => !ng.cau_hinh?.url_danh_sach)
    .map((ng) => ({ nguon: ng.ma, bo_qua: 'chưa cấu hình url_danh_sach' }));

  return {
    run_label: runLabel,
    da_xep_que: messages.length,
    bi_bo: biBo,
    chi_tiet: messages.map((m) => ({
      nguon: m.ma_nguon, transport: m.transport, url_danh_sach: m.url_danh_sach,
    })),
  };
}

/** Job 'quet_nguon': lấy trang danh sách → tách link bài → đẩy từng link vào queue. */
async function xuLyQuetNguon(m, env) {
  if (!m.url_danh_sach) return { bo_qua: 'chưa cấu hình url_danh_sach' };

  const kq = await lay(m.url_danh_sach, m.transport, env, { noiDungNapTay: null, choPhepLui: true, transportFallback: m.cau_hinh?.transport_fallback ?? null });
  if (!kq.ok) {
    await sb(env, `demand_sources?ma=eq.${m.ma_nguon}`, {
      method: 'PATCH',
      body: { lan_loi_cuoi: new Date().toISOString(), so_loi_lien_tiep: (m.so_loi_lien_tiep ?? 0) + 1 },
    });
    return { loi: kq.loi };
  }

  const boc = bocLinkBai(kq.noiDung, m.url_danh_sach, {
    regexBatBuoc: m.regex_link_bai ?? null,
    tran: m.tran ?? 40,
  });

  if (!boc.links.length) {
    return { bo_qua: `không tách được link bài (${boc.cachChon})`, thong_ke: boc.thongKe };
  }

  // Mỗi link là một job riêng → queue tự lo concurrency, không bị timeout.
  const jobBai = boc.links.map((link) => ({
    loai: 'lay_bai',
    run_label: m.run_label,
    ma_nguon: m.ma_nguon,
    transport: m.transport,
    source_query: m.url_danh_sach,
    url: link,
  }));
  for (let i = 0; i < jobBai.length; i += 100) {
    await env.QUEUE_QUET.sendBatch(jobBai.slice(i, i + 100));
  }

  await sb(env, `demand_sources?ma=eq.${m.ma_nguon}`, {
    method: 'PATCH',
    body: { lan_quet_cuoi: new Date().toISOString(), so_loi_lien_tiep: 0 },
  });

  return {
    transport: kq.nguon, da_lui: !!kq.daLui,
    cach_tach_link: boc.cachChon, khuon: boc.khuon ?? null,
    so_link: boc.links.length,
  };
}

/** Job 'lay_bai': lấy nội dung bài → chấm điểm → đẩy vào demand_inbox. */
async function xuLyLayBai(m, env) {
  const ct = await lay(m.url, m.transport, env, { noiDungNapTay: null, choPhepLui: true, transportFallback: m.cau_hinh?.transport_fallback ?? null });
  if (!ct.ok) return { loi: ct.loi };

  const { payloads, boQua } = napNhieuLead([{
    source: m.ma_nguon, url: m.url, noiDung: ct.noiDung, sourceQuery: m.source_query,
  }]);

  if (payloads.length) await dayVaoInbox(env, payloads, m.run_label);
  await ghiQueryLog(env, {
    query: m.source_query, method: m.transport, source: m.ma_nguon, run_label: m.run_label,
    so_lead_moi: payloads.length,
    ghi_chu: boQua.length ? `bỏ ${boQua.length}: ${boQua.map((b) => b.lyDo).join('; ').slice(0, 200)}` : null,
    created_by: 'worker',
  });

  return { so_lead: payloads.length, bo_qua: boQua.length };
}

/** Điều phối một message của queue. Tách hàm để test được. */
export async function xuLyMotMessage(m, env) {
  if (!m || typeof m !== 'object') return { loi: 'Message không hợp lệ' };
  if (m.loai === 'quet_nguon') return xuLyQuetNguon(m, env);
  if (m.loai === 'lay_bai') return xuLyLayBai(m, env);
  return { loi: `Không biết loại message: ${m.loai}` };
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
      if (p === '/api/demand/quet' && request.method === 'POST') {
        if (!env.QUEUE_QUET) {
          return traLoi({ loi: 'Worker chưa có binding QUEUE_QUET — cần bật Cloudflare Queues' }, 500);
        }
        const chiNguon = new URL(request.url).searchParams.get('nguon');
        const ket = await lenhQuet(env, chiNguon);
        return traLoi({ ...ket, buoc_tiep: 'Đã xếp vào queue — Worker xử lý từng nguồn, từng link ngoài request này.' });
      }

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

  // Queue consumer — nhận job quét. Không cần DEMAND_TOKEN (nội bộ).
  async queue(batch, env) {
    const ketQua = [];
    for (const msg of batch.messages) {
      try {
        ketQua.push({ id: msg.id, ...(await xuLyMotMessage(msg.body, env)) });
      } catch (e) {
        // Retry theo max_retries của queue; log lỗi để dò nguyên nhân.
        ketQua.push({ id: msg.id, loi: String(e?.message ?? e) });
      }
    }
    return ketQua;
  },

  // Cron — chỉ bật sau khi kiem-tra-transport xanh và regex_link_bai đã điền.
  // Giờ chỉ xếp queue, không quét đồng bộ nên không lo vượt timeout.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      lenhQuet(env).catch((e) =>
        console.log('Cron xếp queue lỗi:', e.message),
      ),
    );
  },
};
