// services/supabase.js — I/O layer: tất cả giao tiếp Supabase tập trung nơi này
// Nguyên tắc: "máy đề xuất, người bấm" — các hàm chỉ READ hay INSERT, KHÔNG thay đổi trạng thái lead
// Rajas: giao dịch an toàn, lỗi không lan truyền vào luồng chính

// Trong Cloudflare Workers, secrets được inject qua env object, không có process.env hay window
// Tất cả hàm export đều nhận env làm tham số cuối hoặc đầu

import { locTrungTrongLo, locTrungDaCo } from '../core/loc-trung.js';

/** Lấy Supabase URL và Service Key từ env (Workers) hoặc fallback process.env (Node.js tests) */
function getSupabaseConfig(env) {
  const url = env?.SUPABASE_URL || (typeof process !== 'undefined' ? process.env?.SUPABASE_URL : null);
  const key = env?.SUPABASE_SERVICE_KEY || (typeof process !== 'undefined' ? process.env?.SUPABASE_SERVICE_KEY : null);
  return { url, key };
}

// Hàm fetch cơ bản — dùng bởi mọi module
async function req(env, đường_dẫn, { method = 'GET', body, prefer } = {}) {
  const { url, key } = getSupabaseConfig(env);
  if (!url || !key) {
    throw new Error('Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_KEY');
  }
  const res = await fetch(`${url}/rest/v1/${đường_dẫn}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

// --- demand_inbox ---

/** Đồng loạt chèn payloads vào demand_inbox */
export async function napVaoInbox(payloads, runLabel, env) {
  if (!payloads.length) return null;
  return req(env, 'demand_inbox', {
    method: 'POST',
    body: [{ payload: payloads, run_label: runLabel }],
    prefer: 'return=representation',
  });
}

/** Gọi RPC dm_loc_keys_da_co — trả về các lead_key đã tồn tại trong DB.
 *  Yêu cầu migration 20260814_loc_trung_inbox.sql đã được áp dụng. */
export async function layKeysDaCo(env, keys) {
  if (!keys?.length) return [];
  const rows = await req(env, 'rpc/dm_loc_keys_da_co', {
    method: 'POST',
    body: { p_keys: keys },
  });
  return (rows ?? []).map((r) => r.khoa).filter(Boolean);
}

/** Nạp payloads vào inbox NHƯNG chặn trùng trước (trong lô + với DB).
 *  Nếu RPC lọc trùng chưa có (chưa chạy migration), thoái hoá về insert thường
 *  và ghi chú trong kết quả — không để cổng nạp chết vì thiếu migration.
 *  @returns {{payloadsDaNap: object[], trungTrongLo: number, trungDaCo: number, locTrungKhaDung: boolean}}
 */
export async function napVaoInboxLocTrung(payloads, runLabel, env) {
  const { moi: duyNhat, trung: trungTrongLo } = locTrungTrongLo(payloads);

  let moi = duyNhat;
  let trungDaCo = 0;
  let locTrungKhaDung = false;

  if (duyNhat.length) {
    try {
      const keysDaCo = await layKeysDaCo(env, duyNhat.map((p) => p.lead_key));
      locTrungKhaDung = true;
      ({ moi, trung: trungDaCo } = locTrungDaCo(duyNhat, keysDaCo));
    } catch (e) {
      // RPC chưa tồn tại hoặc DB lỗi — insert như cũ, báo rõ trong kết quả
      console.log('locTrungDaCo không chạy được (đã insert không lọc):', e.message);
    }
  }

  if (moi.length) await napVaoInbox(moi, runLabel, env);

  return { payloadsDaNap: moi, trungTrongLo, trungDaCo, locTrungKhaDung };
}

// --- demand_sources ---

export async function layNguon(env, đkSelect = '*') {
  return req(env, `demand_sources?${đkSelect}`);
}

/** Lấy leads từ demand_inbox (chưa merge) */
export async function layInbox(env, { limit = 100, order = 'created_at.desc' } = {}) {
  return req(env, `demand_inbox?select=*&order=${order}&limit=${limit}`);
}

/** Lấy các lead ĐÃ ĐƯỢC NGƯỜI DUYỆT (có status khác 'moi') — dùng cho feedback loop.
 *  Quyết định của người là ground truth: quan_tam/da_lien_he/chot = tín hiệu dương,
 *  bo = tín hiệu âm. */
export async function layLeadDaDuyet(env, { limit = 200 } = {}) {
  return req(env,
    `demand_leads?select=title,raw_text,nhu_cau,score,status,source` +
    `&status=neq.moi&status=not.is.null&order=reviewed_at.desc.nullslast&limit=${limit}`);
}

export async function capNghenguon(env, ma, dữLý) {
  return req(env, `demand_sources?ma=eq.${ma}`, {
    method: 'PATCH',
    body: dữLý,
  });
}

// --- demand_query_log ---

export async function ghiQueryLog(env, dòng) {
  try {
    await req(env, 'demand_query_log', { method: 'POST', body: [dòng] });
  } catch (e) {
    // Không để lỗi phụ làm hỏng luồng chính
    console.log('Không ghi được query_log:', e.message);
  }
}

// --- helper: kiểm tra transport (chạy MỘT LẦN sau khi nạp secret) ---

export async function kiemTraTransport(env, urlThu = 'https://example.com') {
  const { url, key } = getSupabaseConfig(env);
  if (!url || !key) {
    return { ghi_chu: 'Thiếu credential Supabase', ket_qua: false };
  }
  try {
    const kq = await req(env, 'demand_sources?select=*');
    return { ghi_chu: 'Đã chạy kiểm tra transport', ket_qua: kq && kq.length > 0 };
  } catch (e) {
    return { ghi_chu: 'Lỗi kiểm tra transport: ' + e.message, ket_qua: false };
  }
}
