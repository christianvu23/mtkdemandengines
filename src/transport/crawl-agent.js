// src/transport/crawl-agent.js — Bridge between Workers API and external Crawl Agent
//
// ============================================================================
// VÌ SAO CÓ MODULE NÀY
// Crawl Agent chạy trên máy local (Python + Scrapling + Camoufox) vì cần
// browser thật để vượt anti-bot. Workers.dev không chạy được Python/Camoufox.
// Module này cung cấp API endpoints để Crawl Agent gửi data về, và cho phép
// Workers trigger crawl runs qua webhook.
//
// Luồng dữ liệu:
//   Workers (cron/API) → Webhook → Crawl Agent (Python) → crawl → POST /api/crawl/submit
//   Crawl Agent → POST /api/crawl/submit → Workers → nap-lead.js → Supabase
// ============================================================================

/**
 * Handle crawl agent API routes.
 * Called from worker.js when path starts with /api/crawl/
 *
 * @param {Request} request
 * @param {object} env
 * @returns {Response}
 */
export async function handleCrawlAgent(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  // POST /api/crawl/submit — Crawl Agent submits crawled leads
  if (path === '/api/crawl/submit' && request.method === 'POST') {
    return handleSubmitCrawl(request, env);
  }

  // GET /api/crawl/status — Check crawl agent status
  if (path === '/api/crawl/status' && request.method === 'GET') {
    return handleCrawlStatus(env);
  }

  // POST /api/crawl/trigger — Trigger a crawl run (webhook to Python agent)
  if (path === '/api/crawl/trigger' && request.method === 'POST') {
    return handleTriggerCrawl(request, env);
  }

  // GET /api/crawl/sources — List configured crawl sources
  if (path === '/api/crawl/sources' && request.method === 'GET') {
    return handleCrawlSources(env);
  }

  return new Response(JSON.stringify({ error: 'Unknown crawl route' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * POST /api/crawl/submit
 * Receive leads from crawl agent, forward to nap-lead.js pipeline.
 * Body: { leads: [{ source, url, noiDung, tieuDe, postedAt }], run_label? }
 */
async function handleSubmitCrawl(request, env) {
  try {
    const body = await request.json();
    const leads = body.leads || [];
    const runLabel = body.run_label || `crawl-${Date.now()}`;

    if (!leads.length) {
      return Response.json({ ok: true, message: 'No leads to process', run_label: runLabel });
    }

    // Import nap-lead pipeline
    const { napNhieuLead } = await import('../core/nap-lead.js');

    // Normalize leads to match expected format
    const normalizedLeads = leads.map((lead) => ({
      source: lead.source || 'crawl_agent',
      url: lead.url || null,
      noiDung: lead.noiDung || lead.content || '',
      tieuDe: lead.tieuDe || lead.title || null,
      postedAt: lead.postedAt || lead.posted_at || null,
      sourceQuery: lead.sourceQuery || lead.source_query || 'crawl_agent',
    }));

    // Run through scoring pipeline
    const { payloads, boQua, tongVao } = napNhieuLead(normalizedLeads);

    // Store in demand_inbox via Supabase
    if (payloads.length && env?.SUPABASE_URL && env?.SUPABASE_SERVICE_KEY) {
      const { napVaoInbox } = await import('../services/supabase.js');
      try {
        await napVaoInbox(payloads, runLabel, env);
      } catch (e) {
        console.error('Failed to store crawl leads:', e.message);
      }
    }

    return Response.json({
      ok: true,
      run_label: runLabel,
      tong_nhan: leads.length,
      hop_le: payloads.length,
      bo_qua: boQua.length,
      xem_truoc: payloads.slice(0, 5).map((p) => ({
        tieu_de: p.title,
        hang: p.tier,
        diem: p.score,
        nhu_cau: p.nhu_cau,
        nguon: p.source,
      })),
      buoc_tiep: payloads.length > 0
        ? 'Mở giao diện và bấm "Nạp lead mới" để đưa vào bảng chính.'
        : 'Không có lead nào đạt yêu cầu. Thử lại với nguồn khác.',
    });
  } catch (e) {
    return Response.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}

/**
 * GET /api/crawl/status
 * Return crawl agent configuration and last run info.
 */
async function handleCrawlStatus(env) {
  // Read crawl state from KV or D1 if available
  const state = {
    agent: 'crawl-agent-python',
    version: '0.2.0',
    engines: ['scrapling_fast', 'scrapling_stealth', 'camoufox'],
    sources: {
      freelancer_vn: ['vlance', 'freelancer_vn', 'fastlance', 'vietgigs', 'gighit', 'jobboard_vn', 'jobsgo'],
      freelancer_intl: ['upwork_vn', 'freelancer_com_vn', 'truelancer_vn', 'behance_vn', 'contra_vn', 'peopleperhour'],
      jobboard: ['careerviet', 'topcv', 'job123'],
      forum: ['bhw', 'warriorforum', 'voz_marketing', 'brands_vietnam', 'vn_marketing'],
      social: ['tiktok_business', 'fb_groups'],
    },
    total_sources: 21,
    last_run: null, // TODO: store in KV
    next_scheduled: null,
  };

  return Response.json(state);
}

/**
 * POST /api/crawl/trigger
 * Trigger crawl agent via webhook (if configured).
 * Body: { sources?: string[], engines?: string[] }
 */
async function handleTriggerCrawl(request, env) {
  const body = await request.json().catch(() => ({}));
  const webhookUrl = env?.CRAWL_AGENT_WEBHOOK;

  if (!webhookUrl) {
    return Response.json({
      ok: false,
      error: 'CRAWL_AGENT_WEBHOOK not configured',
      hint: 'Set webhook URL via: npx wrangler secret put CRAWL_AGENT_WEBHOOK',
    });
  }

  try {
    // Forward trigger to crawl agent
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'crawl',
        sources: body.sources || null,
        engines: body.engines || null,
        triggered_at: new Date().toISOString(),
      }),
    });

    const result = await res.json().catch(() => ({}));
    return Response.json({
      ok: res.ok,
      triggered: true,
      agent_response: result,
    });
  } catch (e) {
    return Response.json({
      ok: false,
      error: `Failed to trigger crawl agent: ${e.message}`,
    });
  }
}

/**
 * GET /api/crawl/sources
 * List all configured crawl sources with their status.
 */
async function handleCrawlSources(env) {
  const sources = [
    // Vietnamese Freelancer Platforms
    { code: 'vlance', name: 'vLance.vn', engine: 'scrapling_stealth', category: 'freelancer_vn', status: 'active' },
    { code: 'freelancer_vn', name: 'FreelancerViet.vn', engine: 'scrapling_stealth', category: 'freelancer_vn', status: 'active' },
    { code: 'fastlance', name: 'Fastlance.vn', engine: 'scrapling_stealth', category: 'freelancer_vn', status: 'active' },
    { code: 'vietgigs', name: 'VietGigs.vn', engine: 'scrapling_stealth', category: 'freelancer_vn', status: 'active' },
    { code: 'gighit', name: 'GigHit.vn', engine: 'scrapling_stealth', category: 'freelancer_vn', status: 'active' },
    { code: 'jobboard_vn', name: 'JobBoard.vn', engine: 'scrapling_fast', category: 'freelancer_vn', status: 'active' },
    { code: 'jobsgo', name: 'JobsGo.vn', engine: 'scrapling_fast', category: 'freelancer_vn', status: 'active' },
    // International Platforms (VN Market)
    { code: 'upwork_vn', name: 'Upwork Vietnam', engine: 'scrapling_fast', category: 'freelancer_intl', status: 'active' },
    { code: 'freelancer_com_vn', name: 'Freelancer.com VN', engine: 'scrapling_fast', category: 'freelancer_intl', status: 'active' },
    { code: 'truelancer_vn', name: 'Truelancer VN', engine: 'scrapling_fast', category: 'freelancer_intl', status: 'active' },
    { code: 'behance_vn', name: 'Behance Vietnam', engine: 'scrapling_fast', category: 'freelancer_intl', status: 'active' },
    { code: 'contra_vn', name: 'Contra.com VN', engine: 'scrapling_fast', category: 'freelancer_intl', status: 'active' },
    { code: 'peopleperhour', name: 'PeoplePerHour', engine: 'scrapling_fast', category: 'freelancer_intl', status: 'active' },
    // Job Boards
    { code: 'careerviet', name: 'CareerViet.vn', engine: 'scrapling_fast', category: 'jobboard', status: 'active' },
    { code: 'topcv', name: 'TopCV.vn', engine: 'scrapling_fast', category: 'jobboard', status: 'active' },
    { code: 'job123', name: '123Job.vn', engine: 'scrapling_fast', category: 'jobboard', status: 'active' },
    // Forums & Communities
    { code: 'bhw', name: 'BlackHatWorld', engine: 'scrapling_fast', category: 'forum', status: 'active' },
    { code: 'warriorforum', name: 'WarriorForum', engine: 'scrapling_fast', category: 'forum', status: 'active' },
    { code: 'voz_marketing', name: 'VOZ Marketing', engine: 'scrapling_stealth', category: 'forum', status: 'active' },
    { code: 'brands_vietnam', name: 'Brands Vietnam', engine: 'scrapling_fast', category: 'forum', status: 'active' },
    { code: 'vn_marketing', name: 'VietnamMarketing', engine: 'scrapling_fast', category: 'forum', status: 'active' },
    // Social Media (requires Camoufox)
    { code: 'tiktok_business', name: 'TikTok Business', engine: 'camoufox', category: 'social', status: 'requires_camoufox' },
    { code: 'fb_groups', name: 'Facebook Groups', engine: 'camoufox', category: 'social', status: 'requires_camoufox' },
  ];

  return Response.json({ sources, total: sources.length });
}
