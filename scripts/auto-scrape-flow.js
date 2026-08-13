/**
 * scripts/auto-scrape-flow.js — Chạy pipeline scrape tự động cho nhiều nguồn
 * Chạy local: node scripts/auto-scrape-flow.js [source_ma]
 * 
 * Yêu cầu:
 * - npm i -D playwright @supabase/supabase-js dotenv
 * - npx playwright install chromium
 * - .env.local: SUPABASE_URL + SUPABASE_SERVICE_KEY
 */

// Explicitly load .env.local (ES module compatible)
import 'dotenv/config';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Config per source (matching demand_sources.cau_hinh)
// USER THÊM regex đúng cho từng website vào đây
const SOURCE_CONFIG = {
  freelancerviet: {
    listUrl: 'https://freelancerviet.vn/viec-lam-freelance.html',
    // USER: Thay regex này thành pattern đúng cho freelancerviet
    linkPattern: 'freelancerviet\\.vn/thong-tin-viec-freelance/',
    linkSelector: 'a[href]',
    contentSelector: '.job-detail, .project-detail, article, .content',
    transport: 'truc_tiep',
    maxPages: 20,
  },
  vlance: {
    listUrl: 'https://www.vlance.vn/viec-lam-freelance',
    // USER: Thay regex này đúng cho vlance
    linkPattern: '/du-an/',
    linkSelector: 'a[href]',
    contentSelector: '.project-detail, .job-detail, .content, article',
    transport: 'browser_run',
    maxPages: 20,
  },
  topcv: {
    listUrl: 'https://www.topcv.vn/tim-viec-lam-marketing',
    // USER: Thay regex này cho topcv
    linkPattern: 'topcv\\.vn/viec-lam/.*marketing',
    linkSelector: 'a[href]',
    contentSelector: '.job-detail, .job-description, .content',
    transport: 'browser_run',
    maxPages: 15,
  },
  vietnamworks: {
    listUrl: 'https://www.vietnamworks.com/marketing-jobs',
    // USER: Thay regex cho vietnamworks
    linkPattern: 'vietnamworks\\.com/.*-jv-',
    linkSelector: 'a[href]',
    contentSelector: '.job-description, .job-detail, .content',
    transport: 'browser_run',
    maxPages: 15,
  },
  vieclam24h: {
    listUrl: 'https://vieclam24h.vn/tim-kiem-viec-lam-nhanh?nganh=marketing',
    // USER: Thay regex cho vieclam24h
    linkPattern: 'vieclam24h\\.vn/viec-lam/.*',
    linkSelector: 'a[href]',
    contentSelector: '.job-detail, .content, .description',
    transport: 'browser_run',
    maxPages: 15,
  },
  itviec: {
    listUrl: 'https://itviec.com/viec-lam/marketing',
    // USER: Thay regex cho itviec
    linkPattern: 'itviec\\.com/viec-lam/.*marketing',
    linkSelector: 'a[href]',
    contentSelector: '.job-detail, .content',
    transport: 'browser_run',
    maxPages: 15,
  },
  freelancer_vn: {
    listUrl: 'https://freelancer.vn/projects/marketing',
    // USER: Thay regex cho freelancer_vn
    linkPattern: 'freelancer\\.vn/projects/.*marketing',
    linkSelector: 'a[href]',
    contentSelector: '.project-detail, .job-detail, .content',
    transport: 'browser_run',
    maxPages: 15,
  },
};

async function scrapeSource(browser, sourceMa, config) {
  console.log(`\n🔄 [${sourceMa}] Bắt đầu scrape...`);
  
  const page = await browser.newPage();
  try {
    // 1. Mở trang danh sách
    await page.goto(config.listUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3000);

    // 2. Trích link - dùng regex filter nếu có, hoặc lấy tất cả link
    let links;
    if (config.linkPattern) {
      const re = new RegExp(config.linkPattern);
      links = await page.$$eval(config.linkSelector, (els, re) => {
        return [...new Set(els.map(e => e.href).filter(h => h && re.test(h)))];
      }, config.linkPattern);
    } else {
      // Lấy tất cả link nếu không có pattern
      links = await page.$$eval(config.linkSelector, (els) => {
        return [...new Set(els.map(e => e.href).filter(h => h))];
      });
    }

    console.log(`  🔗 Tìm thấy ${links.length} link`);
    if (links.length === 0) return { success: 0, error: 'Không tìm thấy link' };

    // 3. Scrape từng bài
    let success = 0;
    const jobLinks = links.slice(0, config.maxPages);
    
    for (const link of jobLinks) {
      const p = await browser.newPage();
      try {
        await p.goto(link, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await p.waitForTimeout(2000);
        
        const title = await p.title();
        const content = config.contentSelector
          ? await p.$eval(config.contentSelector, el => el.innerText).catch(() => '')
          : await p.evaluate(() => document.body?.innerText ?? '');
        
        if (!content || content.length < 100) {
          console.log(`  ⚠️  Nội dung quá ngắn: ${link}`);
          continue;
        }

        // 4. Đẩy vào demand_inbox
        const { error } = await sb.from('demand_inbox').insert({
          payload: [{
            source: sourceMa,
            url: link,
            noiDung: content,
            tieuDe: title,
            postedAt: new Date().toISOString(),
            sourceQuery: `${sourceMa}_auto`
          }],
          run_label: `auto-${sourceMa}-${Date.now()}`
        });

        if (error) throw error;
        console.log(`  ✅ ${title.slice(0, 60)}...`);
        success++;
      } catch (e) {
        console.error(`  ❌ ${link}: ${e.message}`);
      } finally {
        await p.close().catch(() => {});
      }
      await new Promise(r => setTimeout(r, 1500));
    }

    return { success };
  } catch (e) {
    return { success: 0, error: e.message };
  } finally {
    await page.close().catch(() => {});
  }
}

// Cập nhật stats source đơn giản (không dùng sb.raw)
async function updateSourceStats(sourceMa, success, error) {
  const updates = { lan_quet_cuoi: new Date().toISOString() };
  if (error) {
    updates.lan_loi_cuoi = new Date().toISOString();
  }
  await sb.from('demand_sources').update(updates).eq('ma', sourceMa);
}

async function main() {
  const targetSource = process.argv[2]; // optional: source_ma cụ thể

  // Lấy sources từ DB
  let query = sb.from('demand_sources').select('*').eq('dang_bat', true);
  if (targetSource) query = query.eq('ma', targetSource);
  
  const { data: sources, error } = await query;
  if (error) throw error;
  if (!sources.length) {
    console.log('⚠️ Không có nguồn nào đang bật (dang_bat=true)');
    return;
  }

  console.log(`📋 Sẽ scrape ${sources.length} nguồn: ${sources.map(s => s.ma).join(', ')}`);

  const browser = await chromium.launch({ headless: true });
  let totalSuccess = 0;

  try {
    for (const src of sources) {
      const config = SOURCE_CONFIG[src.ma];
      if (!config) {
        console.log(`  ⚠️  ${src.ma}: chưa có config trong SOURCE_CONFIG`);
        await updateSourceStats(src.ma, 0, 'Missing config');
        continue;
      }

      const result = await scrapeSource(browser, src.ma, config);
      totalSuccess += result.success;
      await updateSourceStats(src.ma, result.success, result.error);
    }
  } finally {
    await browser.close();
  }

  console.log(`\n📊 Tổng kết: ${totalSuccess} bài thành công từ ${sources.length} nguồn`);
  console.log('➡️  Bước tiếp: Dashboard → "Nạp lead mới" (merge_demand_inbox)');
}

main().catch(e => {
  console.error('💥 Fatal:', e);
  process.exit(1);
});