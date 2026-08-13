// src/transport/crawl-api.js
// ============================================================================
// CRAWL API ENDPOINTS — Cloudflare Workers compatible
// Không dùng filesystem, lưu results vào KV hoặc trả về trực tiếp
// ============================================================================

import { crawlAllSources, crawlSource, filterJobLeads, CRAWL_SOURCES } from '../sources/freelance-crawler.js';
import { napNhieuLead } from '../core/nap-lead.js';

// In-memory cache for latest crawl results (Workers don't have filesystem)
let latestCrawlResults = null;
let latestCrawlTime = null;

/**
 * Handle crawl API routes
 */
export async function handleCrawlApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  // GET /api/crawl/status — Xem trạng thái crawl
  if (path === '/api/crawl/status' && request.method === 'GET') {
    return handleGetStatus(request, env);
  }

  // GET /api/crawl/results — Xem crawl results từ cache
  if (path === '/api/crawl/results' && request.method === 'GET') {
    return handleGetResults(request, env);
  }

  // GET /api/crawl/leads — Xem job leads đã filter
  if (path === '/api/crawl/leads' && request.method === 'GET') {
    return handleGetLeads(request, env);
  }

  // POST /api/crawl/run — Trigger crawl và trả về results
  if (path === '/api/crawl/run' && request.method === 'POST') {
    return handleRunCrawl(request, env);
  }

  // GET /api/crawl/sources — List configured sources
  if (path === '/api/crawl/sources' && request.method === 'GET') {
    return handleGetSources(request, env);
  }

  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * GET /api/crawl/status
 */
async function handleGetStatus(request, env) {
  return new Response(JSON.stringify({
    ok: true,
    lastCrawl: latestCrawlTime,
    hasResults: latestCrawlResults !== null,
    sources: Object.keys(CRAWL_SOURCES),
    message: latestCrawlTime
      ? `Last crawl: ${latestCrawlTime}`
      : 'No crawl yet. POST to /api/crawl/run to start.',
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * GET /api/crawl/results
 */
async function handleGetResults(request, env) {
  if (!latestCrawlResults) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'No crawl results yet. POST to /api/crawl/run first.',
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    ok: true,
    crawledAt: latestCrawlTime,
    summary: {
      totalItems: latestCrawlResults.reduce((sum, r) => sum + r.total, 0),
      totalLeads: latestCrawlResults.reduce((sum, r) => sum + filterJobLeads(r.items).length, 0),
      sources: latestCrawlResults.map(r => ({
        name: r.name,
        items: r.total,
        leads: filterJobLeads(r.items).length,
        error: r.error || null,
      })),
    },
    results: latestCrawlResults.map(r => ({
      name: r.name,
      total: r.total,
      sample: r.items.slice(0, 5),
    })),
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * GET /api/crawl/leads
 */
async function handleGetLeads(request, env) {
  if (!latestCrawlResults) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'No leads yet. POST to /api/crawl/run first.',
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const allItems = latestCrawlResults.flatMap(r => r.items);
  const leads = filterJobLeads(allItems);

  return new Response(JSON.stringify({
    ok: true,
    crawledAt: latestCrawlTime,
    count: leads.length,
    leads: leads.slice(0, 50),
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * POST /api/crawl/run
 * Trigger crawl và trả về results
 * Body: { source?: string }
 */
async function handleRunCrawl(request, env) {
  try {
    const body = await request.json().catch(() => ({}));
    const source = body.source;

    let results;
    const startTime = Date.now();

    if (source) {
      if (!CRAWL_SOURCES[source]) {
        return new Response(JSON.stringify({
          ok: false,
          error: `Unknown source: ${source}. Available: ${Object.keys(CRAWL_SOURCES).join(', ')}`,
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      results = [await crawlSource(source)];
    } else {
      results = await crawlAllSources();
    }

    const duration = Date.now() - startTime;
    const totalItems = results.reduce((sum, r) => sum + r.total, 0);
    const totalLeads = results.reduce((sum, r) => sum + filterJobLeads(r.items).length, 0);

    // Cache results
    latestCrawlResults = results;
    latestCrawlTime = new Date().toISOString();

    return new Response(JSON.stringify({
      ok: true,
      message: 'Crawl completed',
      duration: `${duration}ms`,
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
      leads: filterJobLeads(results.flatMap(r => r.items)).slice(0, 20),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      error: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * GET /api/crawl/sources
 */
async function handleGetSources(request, env) {
  const sources = Object.entries(CRAWL_SOURCES).map(([code, config]) => ({
    code,
    name: config.name,
    urls: config.urls,
  }));

  return new Response(JSON.stringify({
    ok: true,
    sources,
    total: sources.length,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
