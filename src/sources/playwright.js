// src/sources/playwright.js — Transport "playwright" chạy trên máy local.
//
// ============================================================================
// VÌ SAO CÓ FILE NÀY
// vLance chặn 403 với client không phải trình duyệt; FreelancerViet trả 200 nhưng
// listing không nằm trong HTML thô. Trình duyệt THẬT (Playwright) vượt được cả hai,
// và chạy trên máy mình nên không tốn phí browser rendering của Cloudflare.
//
// Trả về CÙNG hình dạng như src/transport/index.js:
//   { ok, noiDung, dinhDang: 'html'|'text', nguon: 'playwright', loi? }
// để nếu sau này muốn chạy đúng trong Worker thì chỉ thay transport.
//
// Cài một lần:
//   npm i -D playwright
//   npx playwright install chromium
// ============================================================================

/** Lấy HTML nguyên trang (cho trang danh sách — đưa thẳng vào bocLinkBai). */
export async function layQuaPlaywright(browser, url, { timeoutMs = 30000, choSauKhiTai = 4000 } = {}) {
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    // Nhiều site đổ bài bằng JS sau domcontentloaded — chờ một nhịp rồi mới đọc.
    await page.waitForTimeout(choSauKhiTai);
    const noiDung = await page.content();
    return { ok: true, nguon: 'playwright', dinhDang: 'html', noiDung };
  } catch (e) {
    return { ok: false, nguon: 'playwright', loi: String(e?.message ?? e) };
  } finally {
    await page.close().catch(() => {});
  }
}

/** Lấy tiêu đề + nội dung đọc được của một bài đăng. */
export async function layVanBanBai(browser, url, { timeoutMs = 30000, choSauKhiTai = 3000 } = {}) {
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await page.waitForTimeout(choSauKhiTai);
    const tieuDe = await page.title();
    const noiDung = await page.evaluate(() => document.body?.innerText ?? '');
    return { ok: true, nguon: 'playwright', tieuDe: tieuDe.trim(), noiDung: noiDung.trim().slice(0, 20000) };
  } catch (e) {
    return { ok: false, nguon: 'playwright', loi: String(e?.message ?? e) };
  } finally {
    await page.close().catch(() => {});
  }
}
