#!/usr/bin/env node
/**
 * CRAWL DATA SCRIPT
 * Chạy crawler và lưu results vào file JSON
 * 
 * Usage:
 *   node scripts/crawl-data.mjs              # Crawl tất cả sources
 *   node scripts/crawl-data.mjs vlance       # Chỉ crawl vLance
 *   node scripts/crawl-data.mjs --leads-only # Chỉ lấy job leads
 */

import { crawlAllSources, crawlSource, filterJobLeads } from '../src/sources/freelance-crawler.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// Create data directory if not exists
const DATA_DIR = join(process.cwd(), 'data', 'crawl-results');
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// Parse arguments
const args = process.argv.slice(2);
const sourceArg = args.find(a => !a.startsWith('--'));
const leadsOnly = args.includes('--leads-only');

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('MTK DEMAND ENGINES — CRAWL DATA');
  console.log('='.repeat(70));

  let results;

  if (sourceArg) {
    // Crawl specific source
    console.log(`\nCrawling source: ${sourceArg}`);
    const result = await crawlSource(sourceArg);
    results = [result];
  } else {
    // Crawl all sources
    console.log('\nCrawling all sources...');
    results = await crawlAllSources();
  }

  // Filter job leads if requested
  if (leadsOnly) {
    console.log('\nFiltering job leads...');
    for (const result of results) {
      const leads = filterJobLeads(result.items);
      console.log(`  ${result.name}: ${result.items.length} items → ${leads.length} leads`);
      result.items = leads;
      result.total = leads.length;
    }
  }

  // Summary
  const totalItems = results.reduce((sum, r) => sum + r.total, 0);
  const totalLeads = leadsOnly ? totalItems : results.reduce((sum, r) => {
    return sum + filterJobLeads(r.items).length;
  }, 0);

  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));

  for (const result of results) {
    const status = result.error ? '✗' : '✓';
    const leads = filterJobLeads(result.items).length;
    console.log(`${status} ${result.name}: ${result.total} items (${leads} leads)`);
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
  }

  console.log('\n' + '-'.repeat(70));
  console.log(`Total items: ${totalItems}`);
  console.log(`Total leads: ${totalLeads}`);

  // Save to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = leadsOnly ? `leads-${timestamp}.json` : `crawl-${timestamp}.json`;
  const filepath = join(DATA_DIR, filename);

  const output = {
    crawledAt: new Date().toISOString(),
    source: sourceArg || 'all',
    leadsOnly,
    summary: {
      totalItems,
      totalLeads,
      sources: results.map(r => ({
        name: r.name,
        items: r.total,
        leads: filterJobLeads(r.items).length,
        error: r.error || null,
      })),
    },
    results,
  };

  writeFileSync(filepath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n✓ Saved to: ${filepath}`);

  // Also save latest symlink
  const latestPath = join(DATA_DIR, leadsOnly ? 'leads-latest.json' : 'crawl-latest.json');
  writeFileSync(latestPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`✓ Latest: ${latestPath}`);

  console.log('\n' + '='.repeat(70));
  console.log('NEXT STEPS:');
  console.log('1. Check results in data/crawl-results/');
  console.log('2. Review leads quality');
  console.log('3. Deploy to Workers with: npm run deploy');
  console.log('4. View results at: https://mtkdemandengines.christianvu23.workers.dev/api/crawl/results');
  console.log('='.repeat(70) + '\n');
}

main().catch(error => {
  console.error('\n✗ Error:', error.message);
  process.exit(1);
});
