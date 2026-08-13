// src/sources/freelance-crawler.js
// ============================================================================
// FREELANCE & FORUM CRAWLER — Cloudflare Workers compatible
// Dùng Cloudflare Browser Rendering API thay vì Playwright
// ============================================================================

/**
 * Config cho các nguồn cần crawl
 */
export const CRAWL_SOURCES = {
  vlance: {
    name: 'vLance.vn',
    urls: [
      'https://vlance.vn/viec-lam-freelance/marketing',
      'https://vlance.vn/viec-lam-freelance/content-writing',
    ],
    // Selectors sẽ được update sau khi analyze HTML thật
    selectors: {
      listing: '.project-item, .job-item, article, [class*="project"]',
      title: 'h2, h3, .title, [class*="title"]',
      link: 'a[href*="/du-an/"], a[href*="/viec/"]',
      description: '.description, .summary, p',
    },
  },

  blackhatworld: {
    name: 'BlackHatWorld',
    urls: [
      'https://www.blackhatworld.com/seo/marketplace/',
    ],
    selectors: {
      listing: '.discussionListItem, .structItem, [class*="thread"]',
      title: '.title a, h3 a, [class*="title"] a',
      link: 'a[href*="/threads/"]',
      description: '.snippet, .lastPost, [class*="excerpt"]',
    },
  },

  warriorforum: {
    name: 'WarriorForum',
    urls: [
      'https://www.warriorforum.com/main-internet-marketing-discussion-forum/',
    ],
    selectors: {
      listing: '.threadbit, .discussionListItem, [class*="thread"]',
      title: '.threadtitle a, h3 a, [class*="title"] a',
      link: 'a[href*="/thread/"]',
      description: '.threadmeta, .excerpt, [class*="meta"]',
    },
  },
};

/**
 * Fetch HTML từ URL dùng Cloudflare Browser Rendering API
 * Hoặc fallback về fetch thường nếu không có API
 */
async function fetchWithBrowser(url, env) {
  // Thử dùng Cloudflare Browser Rendering API
  if (env?.CLOUDFLARE_ACCOUNT_ID && env?.CLOUDFLARE_API_TOKEN) {
    try {
      const api = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/markdown`;
      const res = await fetch(api, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          gotoOptions: { waitUntil: 'domcontentloaded', timeout: 30000 },
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          return { ok: true, content: json.result, format: 'markdown' };
        }
      }
    } catch (e) {
      console.log('Browser API failed, falling back to fetch:', e.message);
    }
  }

  // Fallback: fetch thường
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }

    const html = await res.text();
    return { ok: true, content: html, format: 'html' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * Parse HTML và extract items dùng regex (Workers-compatible)
 */
function parseHtmlWithRegex(html, selectors) {
  const items = [];

  // Extract links dựa trên selector patterns
  const linkPatterns = [
    /href="(\/du-an\/[^"]+)"/g,      // vLance
    /href="(\/threads\/[^"]+)"/g,     // BHW
    /href="(\/thread\/[^"]+)"/g,      // WarriorForum
    /href="(\/projects\/[^"]+)"/g,    // Freelancer
  ];

  const foundLinks = new Set();

  for (const pattern of linkPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      foundLinks.add(match[1]);
    }
  }

  // Extract titles và descriptions
  const titlePattern = /<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi;
  const titles = [];
  let match;
  while ((match = titlePattern.exec(html)) !== null) {
    const title = match[1].trim();
    if (title.length > 10 && title.length < 200) {
      titles.push(title);
    }
  }

  // Match titles với links
  for (let i = 0; i < Math.min(titles.length, foundLinks.size); i++) {
    const link = Array.from(foundLinks)[i];
    if (link) {
      items.push({
        title: titles[i],
        link: link.startsWith('http') ? link : link,
        description: '',
        source: '',
        crawledAt: new Date().toISOString(),
      });
    }
  }

  return items;
}

/**
 * Crawl một trang và extract data
 */
export async function crawlPage(url, sourceConfig, env) {
  const result = await fetchWithBrowser(url, env);

  if (!result.ok) {
    return {
      ok: false,
      url,
      error: result.error,
      items: [],
      count: 0,
    };
  }

  const items = parseHtmlWithRegex(result.content, sourceConfig.selectors);

  // Add source info
  const domain = new URL(url).hostname;
  for (const item of items) {
    item.source = domain;
    if (!item.link.startsWith('http')) {
      item.link = `https://${domain}${item.link}`;
    }
  }

  return {
    ok: true,
    url,
    items,
    count: items.length,
  };
}

/**
 * Crawl tất cả URLs của một source
 */
export async function crawlSource(sourceName, env) {
  const config = CRAWL_SOURCES[sourceName];
  if (!config) {
    throw new Error(`Unknown source: ${sourceName}`);
  }

  console.log(`\nCrawling ${config.name}...`);

  const allResults = [];

  for (const url of config.urls) {
    console.log(`  → ${url}`);
    const result = await crawlPage(url, config, env);

    if (result.ok) {
      console.log(`    ✓ Found ${result.count} items`);
      allResults.push(...result.items);
    } else {
      console.log(`    ✗ Error: ${result.error}`);
    }

    // Delay between pages
    await new Promise(r => setTimeout(r, 1000));
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
export async function crawlAllSources(env) {
  const results = [];

  for (const sourceName of Object.keys(CRAWL_SOURCES)) {
    try {
      const result = await crawlSource(sourceName, env);
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
