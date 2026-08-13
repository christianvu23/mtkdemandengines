// src/sources/vlance.js — Source scraper for vLance.vn / similar Vietnamese job boards.
//
// ============================================================================
// VÌ SAO CÓ FILE NÀY
// - vLance chặn 403 với client không phải trình duyệt (fetch thuần)
// - FreelancerViet trả 200 nhưng listing không nằm trong HTML thô
// - Playwright (browser) vượt qua cả hai challenge, và chạy trên máy local nên
//   không tốn phí browser rendering của Cloudflare Workers.
// ============================================================================
//
// Trả về CÙNG hình dạng như src/transport/index.js:
//   { ok, noiDung, dinhDang: 'html'|'text', nguon: 'vlance', loi? }
//
//
// Cài đặt:
//   npm i -D playwright
//   npx playwright install chromium
// ============================================================================

import { chromium } from 'playwright';

/**
 * Lấy HTML nguyên trang từ vLance (cần Playwright chạy trên browser local).
 * - Sử dụng headless chromium để tránh 403 block.
 * - Chờ DOMContentLoaded rồi delay thêm một chút vì site lazy-load nội dung.
 *
 * @param {string} url - URL trang danh sách việc làm vLance
 * @param {object} options
 * @param {number} [options.timeoutMs=30000] - Timeout cho trang tải
 * @param {number} [options.delayMs=4000] - Delay sau domcontentloaded de lazy-load
 * @returns {Promise<{ok: boolean, nguon: 'vlance', dinhDang: 'html', noiDung?: string, loi?: string}>}
 */
export async function layDanhSachVLance(url, { timeoutMs = 30000, delayMs = 4000 } = {}) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    // Delay thêm de lazy-load nội dung động
    await page.waitForTimeout(delayMs);
    const noiDung = await page.content();
    return { ok: true, nguon: 'vlance', dinhDang: 'html', noiDung };
  } catch (e) {
    return { ok: false, nguon: 'vlance', loi: String(e?.message ?? e) };
  } finally {
    await browser.close().catch(() => {});
  }
}

/**
 * Trích xuất tiêu đề và nội dung bài đăng từ vLance.
 * - Trả về tiêu đề, nội dung và URL gốc.
 *
 * @param {string} url - URL chi tiết bài đăng vLance
 * @param {object} options
 * @param {number} [options.timeoutMs=30000] - Timeout
 * @returns {Promise<{ok: boolean, nguon: 'vlance', tieuDe?: string, noiDung?: string, url: string, loi?: string}>}
 */
export async function layChiTietBaiVLance(url, { timeoutMs = 30000 } = {}) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await page.waitForTimeout(2000);

    const tieuDe = await page.title();
    const noiDung = await page.evaluate(() => {
      // Thử lấy nội dung từ các selector phổ biến
      const article = document.querySelector('article') ||
                      document.querySelector('.job-detail') ||
                      document.querySelector('.post-content') ||
                      document.body;
      return article ? article.innerText.trim() : '';
    });

    return {
      ok: true,
      nguon: 'vlance',
      tieuDe: tieuDe.trim(),
      noiDung: noiDung.slice(0, 20000),
      url
    };
  } catch (e) {
    return {
      ok: false,
      nguon: 'vlance',
      loi: String(e?.message ?? e),
      url
    };
  } finally {
    await browser.close().catch(() => {});
  }
}

/**
 * Kiểm tra xem URL có phải là vLance không và normalize link.
 *
 * @param {string} url - URL cần kiểm tra
 * @returns {string|boolean} - URL chuẩn hóa nếu là vLance, ngược lại false
 */
export function tachLinkVLance(url) {
  const vLancePatterns = [
    /v\.ietnamworks\.com/,
    /vlance\.com/,
    /v-lance\.com/,
    /\/v\//i
  ];

  for (const pattern of vLancePatterns) {
    if (pattern.test(url)) {
      return url;
    }
  }
  return false;
}

export default { layDanhSachVLance, layChiTietBaiVLance, tachLinkVLance };