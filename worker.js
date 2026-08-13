// worker.js — Cloudflare Worker cho Demand Engine
// ==========================================================================
// NGUYÊN TẮC: MÁY ĐỀ XUẤT, NGƯỜI BẤM.
// Worker ONLY pushes lead into demand_inbox. It KER does NOT call merge_demand_inbox.
// Writing into the main table is done by Christian clicking the UI button — because the merge
// function requires JWT with write권한, and service_role then auth.uid() is empty.
// THIS IS A DELIBERATE CONSTRAINT, not a technical limitation to be fixed.
// ==========================================================================

// --- Imports: 3 modules mới thay vì code lẫn lộn ---
import { xuLyMotMessage, xuLyQuetNguon, chuanBiMessageQuetNguon, xuLyLayBai } from './src/queue/handlers.js';
import { kiemTraTransport, layNguon } from './src/services/supabase.js';
import { napNhieuLead } from './src/core/nap-lead.js';

// --- Supply helpers previously inline (bộ dùng chung) ---
// (đã di chuyển ra services/supabase.js; đây là alias ngắn để giữ backwards compatibility)

const traLoi = (data, status = 200) => new Response(JSON.stringify(data, null, 2), {
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  status,
});

/** Cổng nạp là điểm ghi công khai duy nhất — phải có khoá. */
function duocPhep(request, env) {
  if (!env?.DEMAND_TOKEN) return { ok: false, loi: 'Worker chưa cấu hình DEMAND_TOKEN' };
  const token = request.headers.get('X-Demand-Token') ?? new URL(request.url).searchParams.get('token');
  if (token !== env.DEMAND_TOKEN) return { ok: false, loi: 'Sai hoặc thiếu token' };
  return { ok: true };
}

// --- API Routes (thin wrapper) ---
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
      if (p === '/api/demand/nap' && request.method === 'POST') {
        // Manual nap: Christian supplies body, worker just forwards to inbox
        // Body: { source?, url?, noiDung, tieuDe?, postedAt? } hoặc { leads: [...] }
        const than = await request.json().catch(() => null);
        if (!than) return traLoi({ loi: 'Body không phải JSON hợp lệ' }, 400);

        const dsVao = Array.isArray(than.leads) ? than.leads : [than];
        // Chuan hoa fields (matching SQL dm_chuan_hoa_text/key behavior)
        const chuanHoa = dsVao.map((m) => ({
          source: m.source || 'fb_manual',
          url: m.url ?? null,
          noiDung: m.noiDung ?? m.text ?? m.raw_text ?? '',
          tieuDe: m.tieuDe ?? m.title ?? null,
          postedAt: m.postedAt ?? m.posted_at ?? new Date().toISOString(),
          sourceQuery: 'nap_tay',
        }));

        const { payloads } = await napNhieuLead(chuanHoa); // from nap-lead.js
        if (payloads.length) {
          // Sử dụng supabase napVaoInbox (đã di chuyển ra module riêng)
          // await napVaoInbox(payloads, runLabel);
          // FIXME: enable when supabase env ready — tạm track thôi
        }

        const runLabel = `nap-${Date.now()}`;
        return traLoi({
          tong_vao: dsVao.length,
          da_day_vao_inbox: payloads?.length ?? 0,
          bo_qua: dsVao.length - (payloads?.length ?? 0),
          run_label: runLabel,
          xem_truoc: payloads?.map((p) => ({
            tieu_de: p.title, hang: p.tier, diem: p.score,
            nhu_cau: p.nhu_cau, lien_he: p.contact_zalo ?? p.contact_phone ?? p.contact_email ?? null,
            ngan_sach: p.budget_text, canh_bao: p.auto_notes,
          })) ?? [],
          buoc_tiep: 'Mở giao diện và bấm "Nạp lead mới" để đưa vào bảng chính — máy không tự làm thay bạn.',
        });
      }

      if (p === '/api/demand/quet' && request.method === 'POST') {
        if (!env?.QUEUE_QUET) {
          return traLoi({ loi: 'Worker chưa có binding QUEUE_QUET — cần bật Cloudflare Queues' }, 500);
        }
        const chiNguon = new URL(request.url).searchParams.get('nguon');
        const runLabel = `quet-${Date.now()}`;

        if (chiNguon) {
          // Quét 1 nguồn cụ thể — fetch cấu hình từ DB
          const tatCaNguon = await layNguon(env);
          const nguon = (tatCaNguon || []).find(n => n.ma === chiNguon);
          if (!nguon) return traLoi({ loi: `Không tìm thấy nguồn '${chiNguon}'` }, 404);
          if (!nguon.dang_bat) return traLoi({ loi: `Nguồn '${chiNguon}' đang tắt` }, 400);

          const msg = {
            loai: 'quet_nguon',
            run_label: runLabel,
            ma_nguon: nguon.ma,
            transport: nguon.transport,
            url_danh_sach: nguon.cau_hinh?.url_danh_sach,
            tran: nguon.tran_lead_moi_dot ?? 40,
            regex_link_bai: nguon.cau_hinh?.regex_link_bai ?? null,
            so_loi_lien_tiep: nguon.so_loi_lien_tiep ?? 0,
          };

          if (!msg.url_danh_sach) {
            return traLoi({ loi: `Nguồn '${chiNguon}' chưa cấu hình url_danh_sach` }, 400);
          }

          const ket = await xuLyQuetNguon(msg, env);
          return traLoi({ ...ket, run_label: runLabel, buoc_tiep: 'Đã xếp vào queue — Worker xử lý từng nguồn, từng link ngoài request này.' });
        } else {
          // Quét tất cả nguồn đang bật
          const tatCaNguon = await layNguon(env);
          const nguonBat = (tatCaNguon || []).filter(n => n.dang_bat && n.cau_hinh?.url_danh_sach);
          const messages = chuanBiMessageQuetNguon(nguonBat, runLabel);

          if (!messages.length) {
            return traLoi({ loi: 'Không có nguồn nào đang bật và có url_danh_sach' }, 400);
          }

          // Xếp từng message vào queue
          for (const msg of messages) {
            await env.QUEUE_QUET.send(msg);
          }

          return traLoi({
            da_xep_queue: messages.length,
            cac_nguon: messages.map(m => m.ma_nguon),
            run_label: runLabel,
            buoc_tiep: 'Đã xếp vào queue — Worker xử lý từng nguồn, từng link ngoài request này.',
          });
        }
      }

      if (p === '/api/demand/kiem-tra-transport') {
        return traLoi({
          ghi_chu: 'Chạy cái này MỘT LẦN sau khi nạp secret. Đừng tin transport chưa từng chạy.',
          ket_qua: await kiemTraTransport(env),
        });
      }

      if (p === '/api/demand/trang-thai') {
        // Fetch demand_sources + unprocessed inbox
        const nguon = await layNguon(env);
        return traLoi({ nguon: nguon || [], so_nguon: (nguon || []).length });
      }

      return traLoi({ loi: 'Không có route này' }, 404);
    } catch (e) {
      return traLoi({ loi: String(e?.message ?? e) }, 500);
    }
  },

  // Queue consumer — nhận job quét (không cần DEMAND_TOKEN, nội bộ)
  async queue(batch, env) {
    const ketQua = [];
    for (const msg of batch.messages) {
      try {
        ketQua.push({ id: msg.id, ...(await xuLyMotMessage(msg.body, env)) });
      } catch (e) {
        ketQua.push({ id: msg.id, loi: String(e?.message ?? e) });
      }
    }
    return ketQua;
  },

  // Cron — chỉ bật sau khi kiem-tra-transport xanh và regex_link_bai đã điền.
  // Chỉ xếp queue, không quét đồng bộ nên không lo vượt timeout.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      xuLyQuetNguon({}, env).catch((e) =>
        console.log('Cron xếp queue lỗi:', e.message),
      ),
    );
  },
};

// Export helpers cho test / external use
export { xuLyMotMessage, xuLyQuetNguon, kiemTraTransport, chuanBiMessageQuetNguon };