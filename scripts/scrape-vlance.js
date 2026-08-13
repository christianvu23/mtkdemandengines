/**
 * scripts/scrape-vlance.js — Scrape vLance jobs và đẩy vào demand_inbox
 * Chạy local: node scripts/scrape-vlance.js
 * 
 * Yêu cầu:
 * - npm i -D playwright @supabase/supabase-js dotenv
 * - npx playwright install chromium
 * - .env.local có SUPABASE_URL + SUPABASE_SERVICE_KEY
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_KEY trong .env.local');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Cấu hình scrape
const CONFIG = {
  listUrl: 'https://vlance.vn/viec-lam/marketing-pr',
  jobLinkSelector: 'a[href*="/du-an/"], a[href*="/viec-lam/"]',
  maxJobs: 10,
  delayMs: 2000,
};

async function scrapeListPage(browser) {
  const page = await browser.newPage();
  try {
    console.log(`📄 Đang tải trang danh sách: ${CONFIG.listUrl}`);
    await page.goto(CONFIG.listUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    const links = await page.$$eval(CONFIG.jobLinkSelector, els => 
      [...new Set(els.map(e => e.href).filter(h => h && h.includes('vlance.vn')))]
    );

    console.log(`🔗 Tìm thấy ${links.length} link bài`);
    return links.slice(0, CONFIG.maxJobs);
  } catch (e) {
    console.error('❌ Lỗi scrape list page:', e.message);
    return [];
  } finally {
    await page.close().catch(() => {});
  }
}

async function scrapeJobPage(browser, url) {
  const page = await browser.newPage();
  try {
    console.log(`📖 Scraping: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    const title = await page.title();
    const content = await page.content();

    return { title: title.trim(), content, url };
  } catch (e) {
    console.error(`❌ Lỗi scrape ${url}:`, e.message);
    return null;
  } finally {
    await page.close().catch(() => {});
  }
}

async function pushToInbox(jobData, runLabel) {
  const { title, content, url } = jobData;
  const payload = {
    source: 'vlance',
    url,
    noiDung: content,
    tieuDe: title,
    postedAt: new Date().toISOString(),
    sourceQuery: 'vlance_list'
  };

  const { error } = await sb.from('demand_inbox').insert({
    payload: [payload],
    run_label: runLabel
  });

  if (error) {
    console.error('❌ Lỗi ghi inbox:', error.message);
    return false;
  }
  console.log('✅ Đã đẩy vào demand_inbox');
  return true;
}

async function main() {
  console.log('🚀 Bắt đầu scrape vLance...');
  console.log(`📋 Config: maxJobs=${CONFIG.maxJobs}, delay=${CONFIG.delayMs}ms`);

  const browser = await chromium.launch({ headless: true });
  const runLabel = `vlance-scrape-${Date.now()}`;

  try {
    const jobLinks = await scrapeListPage(browser);
    
    if (jobLinks.length === 0) {
      console.log('⚠️ Không tìm thấy link nào. Kiểm tra lại selector hoặc trang web.');
      return;
    }

    let success = 0;
    for (const link of jobLinks) {
      const jobData = await scrapeJobPage(browser, link);
      if (jobData) {
        const ok = await pushToInbox(jobData, runLabel);
        if (ok) success++;
      }
      await new Promise(r => setTimeout(r, CONFIG.delayMs));
    }

    console.log(`\n📊 Kết quả: ${success}/${jobLinks.length} bài thành công`);
    console.log(`🏷️  Run label: ${runLabel}`);
    console.log('\n➡️  Bước tiếp: Mở dashboard → bấm "Nạp lead mới" để merge vào demand_leads');
  } finally {
    await browser.close();
  }
}

main().catch(e => {
  console.error('💥 Fatal error:', e);
  process.exit(1);
});