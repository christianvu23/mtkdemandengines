// src/transport/index.js — Tầng vận chuyển: "lấy được nội dung về".
//
// ============================================================================
// VÌ SAO CÓ TẦNG NÀY
// Recon thật ngày 09/08/2026:
//   · vLance.vn        → 403 với client không phải trình duyệt (chặn bot toàn site)
//   · FreelancerViet   → 200 nhưng listing không có trong HTML thô
// Nếu viết scraper gắn chặt vào fetch(), mỗi nguồn khó là một lần viết lại.
// Tách transport ra thì "bị 403" chỉ còn là một dòng cấu hình trong demand_sources.
//
// Tất cả transport trả về CÙNG một hình dạng:
//   { ok, noiDung, dinhDang: 'markdown'|'html', nguon: <ma transport>, loi? }
//
// ⚠️ CHƯA CHẠY THẬT: các transport browser_run và unlocker được viết theo tài liệu
//    chính thức nhưng CHƯA gọi lần nào (phiên xây dựng không có credential).
//    Phải chạy `kiemTraTransport()` một lần sau khi nạp secret, trước khi tin vào chúng.
// ============================================================================

/** @typedef {{ok:boolean, noiDung?:string, dinhDang?:'markdown'|'html', nguon:string, loi?:string}} KetQuaLay */

const UA_TRINH_DUYET =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

export const TIMEOUT_TRUCTIEP_MS = 30_000;
export const TIMEOUT_BROWSERRUN_MS = 45_000;
export const TIMEOUT_UNLOCKER_MS = 60_000;

/** Lỗi có nên thử lại không (mạng/5xx/429 thì có, 4xx khác thì không). */
export function nenThuLai(status) {
  return status === 429 || status === 408 || (status >= 500 && status < 600);
}

export async function thuLaiCoLui(fn, soLan = 3) {
  let loiCuoi;
  for (let i = 0; i < soLan; i++) {
    try {
      const kq = await fn();
      if (kq.ok) return kq;
      loiCuoi = kq;
      if (!kq.thuLaiDuoc) return kq;
    } catch (e) {
      loiCuoi = { ok: false, loi: String(e?.message ?? e), thuLaiDuoc: true };
    }
    if (i < soLan - 1) await new Promise((r) => setTimeout(r, 2 ** i * 1000));
  }
  return loiCuoi;
}

// ---------------------------------------------------------------- truc_tiep
/** Worker fetch() thẳng. Miễn phí. Chỉ hợp nguồn không chặn bot. */
export async function layTrucTiep(url, { timeoutMs = TIMEOUT_TRUCTIEP_MS } = {}) {
  return thuLaiCoLui(async () => {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: ac.signal,
        headers: { 'User-Agent': UA_TRINH_DUYET, 'Accept-Language': 'vi,en;q=0.8' },
      });
      if (!res.ok) {
        return { ok: false, nguon: 'truc_tiep', loi: `HTTP ${res.status}`, thuLaiDuoc: nenThuLai(res.status) };
      }
      return { ok: true, nguon: 'truc_tiep', dinhDang: 'html', noiDung: await res.text() };
    } finally {
      clearTimeout(t);
    }
  });
}

// -------------------------------------------------------------- browser_run
/**
 * Cloudflare Browser Run REST API — endpoint /markdown.
 * Chọn /markdown thay vì /content hay /scrape CÓ LÝ DO:
 * ta không kiểm chứng được CSS selector của vLance từ môi trường xây dựng,
 * nên bám vào selector là bịa. Markdown + bộ luật trong src/core bền hơn nhiều.
 *
 * Tài liệu: developers.cloudflare.com/browser-run/quick-actions/
 * Giá (changelog CF): Workers Paid gồm 10 giờ browser/tháng, vượt $0.09/giờ.
 */
export async function layQuaBrowserRun(url, env, { timeoutMs = TIMEOUT_BROWSERRUN_MS } = {}) {
  if (!env?.CLOUDFLARE_ACCOUNT_ID || !env?.CLOUDFLARE_API_TOKEN) {
    return { ok: false, nguon: 'browser_run', loi: 'Thiếu CLOUDFLARE_ACCOUNT_ID hoặc CLOUDFLARE_API_TOKEN' };
  }
  const api = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/markdown`;
  return thuLaiCoLui(async () => {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch(api, {
        method: 'POST',
        signal: ac.signal,
        headers: {
          Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, gotoOptions: { waitUntil: 'domcontentloaded', timeout: 30000 } }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        return {
          ok: false, nguon: 'browser_run',
          loi: `HTTP ${res.status} ${JSON.stringify(json?.errors ?? '').slice(0, 200)}`,
          thuLaiDuoc: nenThuLai(res.status),
        };
      }
      return { ok: true, nguon: 'browser_run', dinhDang: 'markdown', noiDung: json.result };
    } finally {
      clearTimeout(t);
    }
  });
}

// ----------------------------------------------------------------- unlocker
/**
 * Bright Data Web Unlocker — POST https://api.brightdata.com/request
 * Dùng data_format 'markdown' vì cùng lý do với browser_run ở trên.
 * Rẻ hơn Browser API (tính theo request thành công, không theo băng thông).
 */
export async function layQuaUnlocker(url, env, { timeoutMs = TIMEOUT_UNLOCKER_MS } = {}) {
  if (!env?.BRIGHTDATA_API_KEY || !env?.BRIGHTDATA_UNLOCKER_ZONE) {
    return { ok: false, nguon: 'unlocker', loi: 'Thiếu BRIGHTDATA_API_KEY hoặc BRIGHTDATA_UNLOCKER_ZONE' };
  }
  return thuLaiCoLui(async () => {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch('https://api.brightdata.com/request', {
        method: 'POST',
        signal: ac.signal,
        headers: {
          Authorization: `Bearer ${env.BRIGHTDATA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          zone: env.BRIGHTDATA_UNLOCKER_ZONE,
          url,
          format: 'raw',
          data_format: 'markdown',
          country: 'vn',
        }),
      });
      if (!res.ok) {
        return { ok: false, nguon: 'unlocker', loi: `HTTP ${res.status}`, thuLaiDuoc: nenThuLai(res.status) };
      }
      return { ok: true, nguon: 'unlocker', dinhDang: 'markdown', noiDung: await res.text() };
    } finally {
      clearTimeout(t);
    }
  });
}

// ------------------------------------------------------------------ nap_tay
/** Người đã đọc và gửi nội dung vào. Không gọi mạng, không rủi ro ToS. */
export function layTuNapTay(noiDung) {
  const t = String(noiDung ?? '').trim();
  if (!t) return { ok: false, nguon: 'nap_tay', loi: 'Nội dung rỗng' };
  return { ok: true, nguon: 'nap_tay', dinhDang: 'markdown', noiDung: t };
}

// -------------------------------------------------------------------- điều phối
export const TRANSPORT_HOP_LE = ['truc_tiep', 'browser_run', 'unlocker', 'nap_tay'];

/**
 * Lấy nội dung theo transport đã cấu hình cho nguồn, có ĐƯỜNG LÙI.
 * Thứ tự lùi cố ý: rẻ → đắt. Không bao giờ tự lùi SANG nap_tay (cần người).
 */
export async function lay(url, transport, env, { noiDungNapTay = null, choPhepLui = true, transportFallback = null } = {}) {
  if (transport === 'nap_tay') return layTuNapTay(noiDungNapTay);

  let thuTu;
  if (choPhepLui) {
    if (transportFallback && Array.isArray(transportFallback) && transportFallback.length > 0) {
      thuTu = transportFallback;
    } else {
      thuTu = { truc_tiep: ['truc_tiep', 'browser_run', 'unlocker'],
                browser_run: ['browser_run', 'unlocker'],
                unlocker: ['unlocker', 'browser_run'],
                nap_tay: [] }[transport] ?? [];
    }
  } else {
    thuTu = [transport];
  }

  let cuoi = { ok: false, nguon: transport, loi: 'Chưa thử transport nào' };
  for (const t of thuTu) {
    if (t === 'truc_tiep') cuoi = await layTrucTiep(url);
    else if (t === 'browser_run') cuoi = await layQuaBrowserRun(url, env);
    else if (t === 'unlocker') cuoi = await layQuaUnlocker(url, env);
    if (cuoi.ok) return { ...cuoi, daLui: t !== transport };
  }
  return cuoi;
}

/**
 * Kiểm tra từng transport có thật sự hoạt động không.
 * CHẠY CÁI NÀY MỘT LẦN sau khi nạp secret — đừng tin transport chưa từng chạy.
 */
export async function kiemTraTransport(env, urlThu = 'https://example.com') {
  const ket = {};
  ket.truc_tiep = await layTrucTiep(urlThu);
  ket.browser_run = await layQuaBrowserRun(urlThu, env);
  ket.unlocker = await layQuaUnlocker(urlThu, env);
  return Object.fromEntries(
    Object.entries(ket).map(([k, v]) => [k, { ok: v.ok, loi: v.loi ?? null, soKyTu: v.noiDung?.length ?? 0 }]),
  );
}
