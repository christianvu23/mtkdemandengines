// src/core/loc-trung.js — Chặn lead trùng tại cổng nạp.
//
// Hai tầng lọc:
//   1. locTrungTrongLo() — THUẦN: bỏ payload trùng lead_key trong cùng 1 request.
//   2. locTrungDaCo()    — I/O (gọi qua supabase.js): bỏ payload trùng với
//      demand_leads / demand_inbox chưa xử lý.
//
// Vì sao tầng 1 là hàm thuần: worker.js và src/transport/crawl-agent.js đều
// cần cùng một luật dedup — gom về một chỗ để không bị lệch luật.

/**
 * Bỏ payload trùng lead_key trong cùng một lô. Giữ bản ĐẦU tiên.
 * Payload không có lead_key được giữ lại (napLead luôn tạo key; đây là chốt an toàn).
 *
 * @param {object[]} payloads
 * @returns {{moi: object[], trung: number}}
 */
export function locTrungTrongLo(payloads) {
  const daThay = new Set();
  const moi = [];
  let trung = 0;

  for (const p of payloads ?? []) {
    const key = p?.lead_key;
    if (key && daThay.has(key)) {
      trung += 1;
      continue;
    }
    if (key) daThay.add(key);
    moi.push(p);
  }

  return { moi, trung };
}

/**
 * Tách một lô payload thành phần MỚI và phần ĐÃ TỒN TẠI trong DB.
 * Nhận danh sách key đã tồn tại (do RPC dm_loc_keys_da_co trả về).
 *
 * @param {object[]} payloads
 * @param {string[]} keysDaCo — danh sách lead_key đã có trong DB
 * @returns {{moi: object[], trung: number}}
 */
export function locTrungDaCo(payloads, keysDaCo) {
  const boNho = new Set(keysDaCo ?? []);
  const moi = [];
  let trung = 0;

  for (const p of payloads ?? []) {
    if (p?.lead_key && boNho.has(p.lead_key)) {
      trung += 1;
      continue;
    }
    moi.push(p);
  }

  return { moi, trung };
}
