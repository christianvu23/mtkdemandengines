// src/sources/freelance-crawler.js
// ============================================================================
// FREELANCE & FORUM CRAWLER — Cloudflare Workers compatible
// Dùng Cloudflare Browser Rendering API thay vì Playwright
// ============================================================================

/**
 * Config cho các nguồn cần crawl
 */
export const CRAWL_SOURCES = {
  // ═══════════════════════════════════════════════════════════════
  // NỀN TẢNG FREELANCER VIỆT NAM
  // ═══════════════════════════════════════════════════════════════
  vlance: {
    name: 'vLance.vn',
    category: 'freelancer_vn',
    urls: [
      'https://www.vlance.vn/viec-lam-freelance/marketing',
      'https://www.vlance.vn/viec-lam-freelance/online-marketing',
      'https://www.vlance.vn/viec-lam-freelance/content',
    ],
    selectors: {
      listing: '.project-card, .job-card, .listing-item, article.job-item',
      title: 'h2, h3, .title, .project-title, .job-title',
      link: 'a[href*="/du-an/"], a[href*="/viec/"]',
      description: '.description, .summary, .excerpt, p',
    },
  },
  freelancer_vn: {
    name: 'FreelancerViet.vn',
    category: 'freelancer_vn',
    urls: [
      'https://freelancerviet.vn/viec-lam-freelance/marketing',
      'https://freelancerviet.vn/viec-lam-freelance/content',
    ],
    selectors: {
      listing: '.project-card, .job-item, .card-item, [class*="project"]',
      title: 'h2, h3, h4, .title, [class*="title"]',
      link: 'a[href*="/viec-lam/"]',
      description: '.description, .summary, p',
    },
  },
  fastlance: {
    name: 'Fastlance.vn',
    category: 'freelancer_vn',
    urls: [
      'https://fastlance.vn/dich-vu/marketing',
      'https://fastlance.vn/dich-vu/online-marketing',
    ],
    selectors: {
      listing: '.service-card, .freelancer-card, .gig-card, [class*="service"], article',
      title: 'h2, h3, h4, .title, [class*="title"], [class*="name"]',
      link: 'a[href*="/dich-vu/"], a[href*="/gig/"]',
      description: '.description, .summary, p, [class*="desc"]',
    },
  },
  vietgigs: {
    name: 'VietGigs.vn',
    category: 'freelancer_vn',
    urls: [
      'https://vietgigs.vn/gigs/social-media-ads',
      'https://vietgigs.vn/gigs/tvc-video',
      'https://vietgigs.vn/gigs/content-writing',
    ],
    selectors: {
      listing: '.gig-card, .service-card, [class*="gig"], article',
      title: 'h2, h3, h4, .title, [class*="title"]',
      link: 'a[href*="/gigs/"], a[href*="/service/"]',
      description: '.description, p, [class*="desc"]',
    },
  },
  gighit: {
    name: 'GigHit.vn',
    category: 'freelancer_vn',
    urls: [
      'https://gighit.vn/gigs/marketing',
      'https://gighit.vn/gigs/design',
    ],
    selectors: {
      listing: '[class*="gig"], [class*="service"], article, .card',
      title: 'h2, h3, .title, [class*="title"]',
      link: 'a[href*="/gigs/"], a[href*="/service/"]',
      description: '.description, p',
    },
  },
  jobboard_vn: {
    name: 'JobBoard.vn',
    category: 'freelancer_vn',
    urls: [
      'https://www.jobboard.vn/viec-lam/marketing',
      'https://www.jobboard.vn/viec-lam/freelance',
    ],
    selectors: {
      listing: '.job-card, .job-item, article, [class*="job"]',
      title: 'h2, h3, .title, [class*="title"]',
      link: 'a[href*="/viec-lam/"], a[href*="/job/"]',
      description: '.description, .summary, p',
    },
  },
  jobsgo: {
    name: 'JobsGo.vn',
    category: 'freelancer_vn',
    urls: [
      'https://jobsgo.vn/viec-lam/marketing',
      'https://jobsgo.vn/viec-lam/google-ads',
    ],
    selectors: {
      listing: '.job-item, .job-card, article, [class*="job"]',
      title: 'h2, h3, .title, [class*="title"]',
      link: 'a[href*="/viec-lam/"], a[href*="/job/"]',
      description: '.description, p',
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // NỀN TẢNG FREELANCER QUỐC TẾ (THỊ TRƯỜNG VN)
  // ═══════════════════════════════════════════════════════════════
  upwork_vn: {
    name: 'Upwork Vietnam',
    category: 'freelancer_intl',
    urls: [
      'https://www.upwork.com/hire/marketing-consultants/vietnam/',
      'https://www.upwork.com/hire/digital-marketers/vietnam/',
      'https://www.upwork.com/hire/branding-freelancers/vietnam/',
    ],
    selectors: {
      listing: '[data-test="freelancer-tile"], .upwork-tile, [class*="tile"], article',
      title: 'h2, h3, h4, .title, [class*="name"]',
      link: 'a[href*="/freelancers/"], a[href*="/profile/"]',
      description: '.description, .snippet, p',
    },
  },
  freelancer_com_vn: {
    name: 'Freelancer.com Vietnam',
    category: 'freelancer_intl',
    urls: [
      'https://www.freelancer.com/freelancers/vietnam/marketing',
      'https://www.freelancer.com/jobs/vietnam/marketing/',
    ],
    selectors: {
      listing: '[class*="card"], [class*="item"], article',
      title: 'h2, h3, .title, [class*="title"]',
      link: 'a[href*="/freelancers/"], a[href*="/projects/"]',
      description: '.description, p',
    },
  },
  truelancer_vn: {
    name: 'Truelancer Vietnam',
    category: 'freelancer_intl',
    urls: [
      'https://www.truelancer.com/freelance-marketing-jobs-in-vietnam',
      'https://www.truelancer.com/freelance-video-production-jobs-in-vietnam',
    ],
    selectors: {
      listing: '[class*="card"], [class*="item"], article',
      title: 'h2, h3, .title, [class*="title"]',
      link: 'a[href*="/freelance-"], a[href*="/projects/"]',
      description: '.description, p',
    },
  },
  behance_vn: {
    name: 'Behance Vietnam',
    category: 'freelancer_intl',
    urls: [
      'https://www.behance.net/search/projects?field=brand-design&location=VN',
    ],
    selectors: {
      listing: '[class*="project"], .project-card, article',
      title: 'h2, h3, .title, [class*="title"]',
      link: 'a[href*="/projects/"], a[href*="/profiles/"]',
      description: '.description, p',
    },
  },
  contra_vn: {
    name: 'Contra.com Vietnam',
    category: 'freelancer_intl',
    urls: [
      'https://contra.com/discover?category=brand-design&location=vietnam',
    ],
    selectors: {
      listing: '[class*="card"], [class*="item"], article',
      title: 'h2, h3, .title, [class*="title"]',
      link: 'a[href*="/discover/"], a[href*="/profile/"]',
      description: '.description, p',
    },
  },
  peopleperhour: {
    name: 'PeoplePerHour',
    category: 'freelancer_intl',
    urls: ['https://www.peopleperhour.com/freelance-marketing-jobs'],
    selectors: {
      listing: '.item, .job-card, article, [class*="project"]',
      title: 'h2, h3, .title, [class*="title"]',
      link: 'a[href*="/project/"], a[href*="/job/"]',
      description: '.description, p',
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // TRANG TUYỂN DỤNG VIỆC LÀM MARKETING
  // ═══════════════════════════════════════════════════════════════
  careerviet: {
    name: 'CareerViet.vn',
    category: 'jobboard',
    urls: [
      'https://careerviet.vn/viec-lam/Freelancer-k-vi.html',
      'https://careerviet.vn/viec-lam/Digital-Marketing-k-vi.html',
    ],
    selectors: {
      listing: '.job-item, .job-card, [class*="job"], article',
      title: 'h2, h3, .title, [class*="title"]',
      link: 'a[href*="/viec-lam/"]',
      description: '.description, .summary, p',
    },
  },
  topcv: {
    name: 'TopCV.vn',
    category: 'jobboard',
    urls: ['https://www.topcv.vn/tim-viec-lam/marketing-freelancer'],
    selectors: {
      listing: '.job-item, .job-card, [class*="job"], article',
      title: 'h2, h3, .title, [class*="title"]',
      link: 'a[href*="/viec-lam/"]',
      description: '.description, p',
    },
  },
  job123: {
    name: '123Job.vn',
    category: 'jobboard',
    urls: [
      'https://123job.vn/viec-lam/freelancer-marketing',
      'https://123job.vn/viec-lam/facebook-marketing-freelancer',
      'https://123job.vn/viec-lam/google-ads-freelancer',
    ],
    selectors: {
      listing: '.job-item, .job-card, [class*="job"], article',
      title: 'h2, h3, .title, [class*="title"]',
      link: 'a[href*="/viec-lam/"]',
      description: '.description, p',
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // DIỄN ĐÀN / CỘNG ĐỒNG MARKETING
  // ═══════════════════════════════════════════════════════════════
  blackhatworld: {
    name: 'BlackHatWorld',
    category: 'forum',
    urls: [
      'https://www.blackhatworld.com/seo/marketplace/',
      'https://www.blackhatworld.com/forums/social-media/',
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
    category: 'forum',
    urls: [
      'https://www.warriorforum.com/main-internet-marketing-discussion-forum/',
      'https://www.warriorforum.com/ask-me-anything/',
    ],
    selectors: {
      listing: '.threadbit, .discussionListItem, [class*="thread"]',
      title: '.threadtitle a, h3 a, [class*="title"] a',
      link: 'a[href*="/thread/"]',
      description: '.threadmeta, .excerpt, [class*="meta"]',
    },
  },
  voz_marketing: {
    name: 'VOZ Marketing',
    category: 'forum',
    urls: ['https://voz.vn/f/marketing-PR.34/'],
    selectors: {
      listing: '.structItem, .structItem--thread, a[href*="/t/"]',
      title: 'h2, h3, .title, [class*="title"]',
      link: 'a[href*="/t/"]',
      description: '.structItem-overview, .lastPost',
    },
  },
  brands_vietnam: {
    name: 'Brands Vietnam',
    category: 'forum',
    urls: [
      'https://www.brandsvietnam.com/cong-dong',
      'https://www.brandsvietnam.com/dien-dan',
    ],
    selectors: {
      listing: '.discussionListItem, .structItem, a[href*="/threads/"], a[href*="/bai-viet/"]',
      title: 'h2, h3, .title, [class*="title"]',
      link: 'a[href*="/threads/"], a[href*="/bai-viet/"]',
      description: '.snippet, .excerpt, p',
    },
  },
  vn_marketing: {
    name: 'VietnamMarketing.com.vn',
    category: 'forum',
    urls: [
      'https://vietnammarketing.com.vn/dien-dan/',
      'https://vietnammarketing.com.vn/hoi-dap/',
    ],
    selectors: {
      listing: 'article, .post-item, a[href*="/dien-dan/"], a[href*="/hoi-dap/"]',
      title: 'h2, h3, .title, [class*="title"]',
      link: 'a[href*="/dien-dan/"], a[href*="/hoi-dap/"]',
      description: '.content, .summary, p',
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
    /href="(\/projects\/[^"]+)"/g,    // Freelancer.com
    /href="(\/viec-lam\/[^"]+)"/g,    // CareerViet, TopCV, 123Job, JobBoard, JobsGo
    /href="(\/dich-vu\/[^"]+)"/g,     // Fastlance
    /href="(\/gigs\/[^"]+)"/g,        // VietGigs, GigHit
    /href="(\/freelancers\/[^"]+)"/g, // Upwork, Freelancer.com
    /href="(\/hire\/[^"]+)"/g,        // Upwork hire pages
    /href="(\/t\/[^"]+)"/g,           // VOZ (XenForo)
    /href="(\/bai-viet\/[^"]+)"/g,    // Brands Vietnam
    /href="(\/freelance-[^\"]+)"/g,   // Truelancer
    /href="(\/dien-dan\/[^"]+)"/g,    // VietnamMarketing
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
