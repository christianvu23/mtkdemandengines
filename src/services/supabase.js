// services/supabase.js — I/O layer: tất cả giao tiếp Supabase tập trung nơi này
// Nguyên tắc: "máy đề xuất, người bấm" — các hàm chỉ READ hay INSERT, KHÔNG thay đổi trạng thái lead
// Rajas: giao dịch an toàn, lỗi không lan truyền vào luồng chính

// Trong Cloudflare Workers, secrets được inject qua env object, không có process.env hay window
// Tất cả hàm export đều nhận env làm tham số cuối hoặc đầu

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

// --- demand_sources ---

export async function layNguon(env, đkSelect = '*') {
  return req(env, `demand_sources?${đkSelect}`);
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
