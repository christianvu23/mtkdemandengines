// services/supabase.js — I/O layer: tất cả giao tiếp Supabase tập trung nơi này
// Nguyên tắc: "máy đề xuất, người bấm" — các hàm chỉ READ hay INSERT, KHÔNG thay đổi trạng thái lead
// Rajas: giao dịch an toàn, lỗi không lan truyền vào luồng chính

export const SUPABASE = {
  URL: typeof window !== 'undefined' ? window.SUPABASE_URL : process.env.SUPABASE_URL,
  SERVICE_KEY: typeof window !== 'undefined' ? window.SUPABASE_SERVICE_KEY : process.env.SUPABASE_SERVICE_KEY,
};

// Hàm fetch cơ bản — dùng bởi mọi module
async function req(đường_dẫn, { method = 'GET', body, prefer } = {}) {
  if (!SUPABASE.URL || !SUPABASE.SERVICE_KEY) {
    throw new Error('Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_KEY');
  }
  const res = await fetch(`${SUPABASE.URL}/rest/v1/${đường_dẫn}`, {
    method,
    headers: {
      apikey: SUPABASE.SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE.SERVICE_KEY}`,
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
export async function napVaoInbox(payloads, runLabel) {
  if (!payloads.length) return null;
  return req('demand_inbox', {
    method: 'POST',
    body: [{ payload: payloads, run_label: runLabel }],
    prefer: 'return=representation',
  });
}

// --- demand_sources ---

export async function layNguon(đkSelect = '*') {
  return req(`demand_sources?${đkSelect}`);
}

export async function capNghenguon(ma, dữLý) {
  return req(`demand_sources?ma=eq.${ma}`, {
    method: 'PATCH',
    body: dữLý,
  });
}

// --- demand_query_log ---

export async function ghiQueryLog(dòng) {
  try {
    await req('demand_query_log', { method: 'POST', body: [dong] });
  } catch (e) {
    // Không để lỗi phụ làm hỏng luồng chính — đã trong nap-lead.js
    console.log('Không ghi được query_log:', e.message);
  }
}

// --- helper: kiểm tra transport (chạy MỘT LẦN sau khi nạp secret) ---

export async function kiemTraTransport(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return { ghi_chu: 'Thiếu credential Supabase', ket_qua: false };
  }
  try {
    const kq = await req('demand_sources?select=*');
    return { ghi_chu: 'Đã chạy kiểm tra transport', ket_qua: kq && kq.length > 0 };
  } catch (e) {
    return { ghi_chu: 'Lỗi kiểm tra transport: ' + e.message, ket_qua: false };
  }
}