// src/sources/freelance-crawler.js
// ============================================================================
// FREELANCE & FORUM CRAWLER
// Crawl data từ các sites: vLance, FreelancerVN, BlackHatWorld, WarriorForum
// ============================================================================

import { chromium } from 'playwright';

/**
 * Config cho các nguồn cần crawl
 */
export const CRAWL_SOURCES = {
  vlance: {
    name: 'vLance.vn',
    urls: [
      'https://vlance.vn/viec-lam-freelance/marketing',
      'https://vlance.vn/viec-lam-freelance/content-writing',
      'https://vlance.vn/viec-lam-freelance/design',
    ],
    // Selectors sẽ được update sau khi analyze HTML thật
    selectors: {
      listing: '.project-item, .job-item, article',
      title: 'h2, h3, .title',
      link: 'a[href*="/du-an/"]',
      description: '.description, .summary',
    },
  },

  blackhatworld: {
    name: 'BlackHatWorld',
    urls: [
      'https://www.blackhatworld.com/seo/marketplace/',
      'https://www.blackhatworld.com/seo/social-media/',
    ],
    selectors: {
      listing: '.discussionListItem, .structItem',
      title: '.title a, h3 a',
      link: 'a[href*="/threads/"]',
      description: '.snippet, .lastPost',
    },
  },

  warriorforum: {
    name: 'WarriorForum',
    urls: [
      'https://www.warriorforum.com/main-internet-marketing-discussion-forum/',
    ],
    selectors: {
      listing: '.threadbit, .discussionListItem',
      title: '.threadtitle a, h3 a',
      link: 'a[href*="/thread/"]',
      description: '.threadmeta, .excerpt',
    },
  },
};

/**
 * Crawl một trang và extract data
 */
export async function crawlPage(url, sourceConfig) {
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000); // Wait for lazy load

    const results = await page.evaluate((selectors) => {
      const items = [];

      // Try multiple selector patterns
      const listingSelectors = selectors.listing.split(',').map(s => s.trim());

      for (const selector of listingSelectors) {
        const elements = document.querySelectorAll(selector);

        for (const el of elements) {
          // Extract title
          const titleSelectors = selectors.title.split(',').map(s => s.trim());
          let title = '';
          for (const ts of titleSelectors) {
            const titleEl = el.querySelector(ts);
            if (titleEl) {
              title = titleEl.textContent.trim();
              break;
            }
          }

          // Extract link
          const linkSelectors = selectors.link.split(',').map(s => s.trim());
          let link = '';
          for (const ls of linkSelectors) {
            const linkEl = el.querySelector(ls);
            if (linkEl) {
              link = linkEl.href || linkEl.getAttribute('href') || '';
              break;
            }
          }

          // Extract description
          const descSelectors = selectors.description.split(',').map(s => s.trim());
          let description = '';
          for (const ds of descSelectors) {
            const descEl = el.querySelector(ds);
            if (descEl) {
              description = descEl.textContent.trim();
              break;
            }
          }

          if (title || link) {
            items.push({
              title: title.slice(0, 200),
              link: link,
              description: description.slice(0, 500),
              source: window.location.hostname,
              crawledAt: new Date().toISOString(),
            });
          }
        }

        if (items.length > 0) break; // Stop if we found items
      }

      return items;
    }, sourceConfig.selectors);

    return {
      ok: true,
      url,
      items: results,
      count: results.length,
    };
  } catch (error) {
    return {
      ok: false,
      url,
      error: error.message,
      items: [],
      count: 0,
    };
  } finally {
    await browser.close();
  }
}

/**
 * Crawl tất cả URLs của một source
 */
export async function crawlSource(sourceName) {
  const config = CRAWL_SOURCES[sourceName];
  if (!config) {
    throw new Error(`Unknown source: ${sourceName}`);
  }

  console.log(`\nCrawling ${config.name}...`);

  const allResults = [];

  for (const url of config.urls) {
    console.log(`  → ${url}`);
    const result = await crawlPage(url, config);

    if (result.ok) {
      console.log(`    ✓ Found ${result.count} items`);
      allResults.push(...result.items);
    } else {
      console.log(`    ✗ Error: ${result.error}`);
    }

    // Delay between pages
    await new Promise(r => setTimeout(r, 2000));
  }

  return {
    source: sourceName,
    name: config.name,
    items: allResults,
    total: allResults.length,
  };
}

/**
 * Crawl tất cả sources
 */
export async function crawlAllSources() {
  const results = [];

  for (const sourceName of Object.keys(CRAWL_SOURCES)) {
    try {
      const result = await crawlSource(sourceName);
      results.push(result);
    } catch (error) {
      results.push({
        source: sourceName,
        error: error.message,
        items: [],
        total: 0,
      });
    }
  }

  return results;
}

/**
 * Filter items có signal là job lead
 */
export function filterJobLeads(items) {
  const LEAD_SIGNALS = [
    // Vietnamese
    'cần tìm', 'cần thuê', 'tìm người', 'tìm agency', 'tìm freelancer',
    'cần người', 'tìm đội', 'cần đội', 'cần chạy ads', 'thuê ngoài',
    'cần thiết kế', 'cần làm marketing', 'cần quay',
    // English
    'looking for', 'need help', 'hiring', 'looking to hire',
    'need marketing', 'looking for agency', 'need someone',
  ];

  return items.filter(item => {
    const text = `${item.title} ${item.description}`.toLowerCase();
    return LEAD_SIGNALS.some(signal => text.includes(signal));
  });
}
