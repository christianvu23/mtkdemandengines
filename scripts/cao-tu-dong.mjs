#!/usr/bin/env node
/**
 * scripts/cao-tu-dong.mjs — Cào lead tự động trên máy mình bằng Playwright.
 *
 *   npm i -D playwright && npx playwright install chromium   # cài một lần
 *   cp cao-nguon.example.json cao-nguon.json                 # sửa URL theo ý
 *   node scripts/cao-tu-dong.mjs                             # chạy thật
 *   node scripts/cao-tu-dong.mjs --nguon vlance --dry-run    # chỉ xem, không gửi
 *
 * Cần biến môi trường DEMAND_TOKEN (khoá cổng nạp của worker).
 *
 * Đường ống:
 *   1. Playwright mở trang danh sách của từng nguồn (trình duyệt thật → qua 403)
 *   2. Tái dùng src/core/boc-link.js để tách link bài theo khuôn đường dẫn
 *   3. Mở từng bài, lấy tiêu đề + nội dung đọc được
 *   4. Gửi theo lô tới /api/demand/nap — worker chấm điểm và đưa vào demand_inbox.
 *      Máy vẫn CHỈ đưa vào hàng đợi; nạp vào bảng chính là do Christian bấm.
 */

import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { bocLinkBai } from '../src/core/boc-link.js';
import { layQuaPlaywright, layVanBanBai } from '../src/sources/playwright.js';

const [, , ...args] = process.argv;
function layGiaTri(co) {
  const i = args.indexOf(co);
  if (i === -1) return null;
  return args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null;
}
const chonNguon = layGiaTri('--nguon');
const dryRun = args.includes('--dry-run');

const config = JSON.parse(readFileSync('cao-nguon.json', 'utf8'));
const TOKEN = process.env.DEMAND_TOKEN;
if (!dryRun && !TOKEN) {
  console.error('Thiếu DEMAND_TOKEN — đặt trước khi chạy: set DEMAND_TOKEN=... (bỏ qua khi --dry-run)');
  process.exit(2);
}

async function guiWorker(workerUrl, leads) {
  const res = await fetch(`${workerUrl}/api/demand/nap`, {
    method: 'POST',
    headers: { 'X-Demand-Token': TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ leads }),
  });
  return res.json();
}

async function chayMotNguon(browser, src) {
  const { ma, urlDanhSach, tran = 40, regexLinkBai = null } = src;
  console.log(`\n=== ${ma} — ${urlDanhSach}`);

  const kq = await layQuaPlaywright(browser, urlDanhSach);
  if (!kq.ok) {
    console.log(`  ✗ Không mở được trang danh sách: ${kq.loi}`);
    return { ma, loi: kq.loi };
  }

  const boc = bocLinkBai(kq.noiDung, urlDanhSach, { regexBatBuoc: regexLinkBai, tran });
  console.log(`  ${boc.cachChon} → ${boc.links.length} link bài (khuôn ${boc.khuon ?? '?'})`);
  console.log(`  Thống kê: ${JSON.stringify(boc.thongKe)}`);

  const leads = [];
  for (const link of boc.links) {
    const bai = await layVanBanBai(browser, link);
    if (!bai.ok) { console.log(`  ✗ ${link} — ${bai.loi}`); continue; }
    leads.push({ source: ma, url: link, tieuDe: bai.tieuDe, noiDung: bai.noiDung });
    console.log(`  ✓ ${link} — ${(bai.tieuDe ?? '').slice(0, 60)}`);
  }

  if (dryRun) {
    console.log(`  [dry-run] sẽ gửi ${leads.length} lead tới ${config.workerUrl}`);
    return { ma, soLead: leads.length, dryRun: true };
  }

  const ket = await guiWorker(config.workerUrl, leads);
  console.log(`  Gửi ${leads.length} lead → vào inbox ${ket.da_day_vao_inbox}, bỏ qua ${ket.bo_qua?.length ?? 0}`);
  return { ma, soLead: leads.length, ket };
}

const browser = await chromium.launch({ headless: true });
try {
  const nguon = chonNguon ? config.nguon.filter((n) => n.ma === chonNguon) : config.nguon;
  for (const src of nguon) {
    await chayMotNguon(browser, src);
  }
  console.log('\nXong.');
} finally {
  await browser.close().catch(() => {});
}
