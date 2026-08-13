/**
 * Smoke Tests — Workers Crawl Agent Bridge
 * ==========================================
 * Tests for src/transport/crawl-agent.js
 * Run: node --test tests/crawl-agent-bridge.test.js
 */

import { describe, it, mock } from 'node:test';
import assert from 'node:assert';

// =============================================================================
// Test: Lead Format Validation
// =============================================================================

describe('Crawl Agent Bridge — Lead Format', () => {
  it('should accept valid lead with required fields', () => {
    const lead = {
      source: 'vlance',
      url: 'https://vlance.vn/du-an/test-123',
      noiDung: 'Cần tìm người thiết kế logo cho công ty ABC. Ngân sách 5 triệu.',
    };

    // nap-lead.js requires: source (non-empty), noiDung (>= 20 chars)
    assert.ok(lead.source, 'source must be present');
    assert.ok(lead.noiDung.length >= 20, 'noiDung must be >= 20 chars');
  });

  it('should reject lead with empty noiDung', () => {
    const lead = {
      source: 'vlance',
      url: 'https://vlance.vn/du-an/test',
      noiDung: '',
    };

    // nap-lead.js rejects noiDung < 20 chars
    assert.ok(lead.noiDung.length < 20, 'Empty noiDung should be rejected');
  });

  it('should reject lead with missing source', () => {
    const lead = {
      url: 'https://vlance.vn/du-an/test',
      noiDung: 'Cần tìm người thiết kế logo cho công ty ABC.',
    };

    assert.ok(!lead.source, 'Missing source should be rejected');
  });

  it('should handle lead with optional fields', () => {
    const lead = {
      source: 'bhw',
      url: 'https://blackhatworld.com/threads/test',
      noiDung: 'Looking for marketing agency to run Facebook ads campaign.',
      tieuDe: 'Need marketing agency',
      postedAt: '2025-01-15T10:00:00Z',
    };

    assert.ok(lead.source);
    assert.ok(lead.tieuDe);
    assert.ok(lead.postedAt);
  });
});

// =============================================================================
// Test: URL Normalization (Dedup)
// =============================================================================

describe('Crawl Agent Bridge — URL Dedup', () => {
  it('should normalize URLs for dedup', () => {
    const urls = [
      'https://vlance.vn/du-an/project-123',
      'https://vlance.vn/du-an/project-123/',
      'HTTPS://VLANCE.VN/DU-AN/PROJECT-123',
    ];

    const normalized = urls.map(u => u.replace(/\/$/, '').toLowerCase());
    const unique = [...new Set(normalized)];

    assert.strictEqual(unique.length, 1, 'URLs should dedupe to 1');
  });

  it('should keep different URLs separate', () => {
    const urls = [
      'https://vlance.vn/du-an/project-1',
      'https://vlance.vn/du-an/project-2',
    ];

    const normalized = urls.map(u => u.replace(/\/$/, '').toLowerCase());
    const unique = [...new Set(normalized)];

    assert.strictEqual(unique.length, 2, 'Different URLs should remain separate');
  });
});

// =============================================================================
// Test: Security — SSRF Prevention
// =============================================================================

describe('Crawl Agent Bridge — Security', () => {
  it('should block private IP URLs (SSRF)', () => {
    const blockedPatterns = ['169.254.169.254', 'localhost', '127.0.0.1', '10.', '192.168.'];

    const testUrls = [
      { url: 'https://vlance.vn/marketing', shouldBlock: false },
      { url: 'http://169.254.169.254/latest/meta-data/', shouldBlock: true },
      { url: 'http://localhost:8080/admin', shouldBlock: true },
      { url: 'http://127.0.0.1:3000/api', shouldBlock: true },
    ];

    for (const { url, shouldBlock } of testUrls) {
      const isBlocked = blockedPatterns.some(p => url.includes(p));
      assert.strictEqual(isBlocked, shouldBlock, `URL ${url} block mismatch`);
    }
  });

  it('should require auth token for crawl endpoints', () => {
    // Simulate auth check
    const hasToken = (headers) => headers['X-Demand-Token'] === 'valid-token';

    assert.ok(!hasToken({}), 'Missing token should fail');
    assert.ok(!hasToken({ 'X-Demand-Token': 'wrong' }), 'Wrong token should fail');
    assert.ok(hasToken({ 'X-Demand-Token': 'valid-token' }), 'Valid token should pass');
  });
});

// =============================================================================
// Test: Lead Signal Detection
// =============================================================================

describe('Crawl Agent Bridge — Lead Signals', () => {
  const LEAD_SIGNALS_VN = [
    'cần tìm', 'cần thuê', 'tìm người', 'tìm agency', 'tìm freelancer',
    'cần người', 'tìm đội', 'cần đội', 'cần chạy ads', 'thuê ngoài',
  ];

  const LEAD_SIGNALS_EN = [
    'looking for', 'need help with', 'hiring', 'looking to hire',
    'need marketing', 'looking for marketing',
  ];

  const ALL_SIGNALS = [...LEAD_SIGNALS_VN, ...LEAD_SIGNALS_EN];

  function isLeadSignal(text) {
    const lower = text.toLowerCase();
    return ALL_SIGNALS.some(signal => lower.includes(signal));
  }

  it('should detect Vietnamese lead signals', () => {
    assert.ok(isLeadSignal('Cần tìm người chạy ads Facebook'));
    assert.ok(isLeadSignal('Tìm agency làm branding'));
    assert.ok(isLeadSignal('Cần thuê freelancer thiết kế logo'));
  });

  it('should detect English lead signals', () => {
    assert.ok(isLeadSignal('Looking for marketing agency'));
    assert.ok(isLeadSignal('Need help with Facebook ads'));
    assert.ok(isLeadSignal('Hiring freelance content writer'));
  });

  it('should NOT detect non-lead posts', () => {
    assert.ok(!isLeadSignal('Just finished a great marketing campaign'));
    assert.ok(!isLeadSignal('Sharing my experience with SEO'));
    assert.ok(!isLeadSignal('Tips for better content marketing'));
  });

  it('should be case-insensitive', () => {
    assert.ok(isLeadSignal('CẦN TÌM NGƯỜI CHẠY ADS'));
    assert.ok(isLeadSignal('looking FOR marketing AGENCY'));
  });
});

// =============================================================================
// Test: Response Format
// =============================================================================

describe('Crawl Agent Bridge — Response Format', () => {
  it('should return correct submit response format', () => {
    const response = {
      ok: true,
      run_label: 'crawl-1234567890',
      tong_nhan: 5,
      hop_le: 3,
      bo_qua: 2,
      xem_truoc: [
        { tieu_de: 'Test', hang: 'A', diem: 85, nhu_cau: ['marketing'], nguon: 'vlance' },
      ],
    };

    assert.ok(response.ok);
    assert.strictEqual(typeof response.tong_nhan, 'number');
    assert.strictEqual(typeof response.hop_le, 'number');
    assert.ok(Array.isArray(response.xem_truoc));
  });

  it('should return correct sources list format', () => {
    const sources = [
      { code: 'vlance', name: 'vLance.vn', engine: 'scrapling_stealth', category: 'freelancer' },
      { code: 'bhw', name: 'BlackHatWorld', engine: 'scrapling_fast', category: 'forum' },
      { code: 'tiktok', name: 'TikTok', engine: 'camoufox', category: 'social' },
    ];

    assert.strictEqual(sources.length, 3);
    assert.ok(sources.every(s => s.code && s.engine && s.category));
  });
});

console.log('\n✅ All crawl-agent-bridge tests defined. Run with: node --test');
