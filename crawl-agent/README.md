# MTK Demand Engines — Crawl Agent

Hybrid **Scrapling + Camoufox** agent for crawling job opportunities from freelancer sites, marketing forums, and social media platforms.

> 🛡️ **Resilience & Safety (2026-08):** dedup phía server, reconciliation
> baseline, circuit breaker + backoff, feedback loop từ quyết định duyệt,
> error recovery contract, SSRF + robots.txt guard.
> Chi tiết: [HARDENING.md](./HARDENING.md)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Crawl Agent (Python)                   │
│                                                         │
│  ┌─────────────────────┐  ┌──────────────────────────┐  │
│  │  Scrapling Engine    │  │  Camoufox Engine          │  │
│  │  ├─ Fast (Fetcher)  │  │  ├─ Anti-detect Firefox   │  │
│  │  └─ Stealth (CF)    │  │  ├─ Fingerprint rotation  │  │
│  └──────────┬──────────┘  │  └─ Human-like behavior   │  │
│             │              └────────────┬──────────────┘  │
│             ▼                           ▼                 │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              Spider Layer                            │ │
│  │  ├─ Freelancer spiders (vLance, FreelancerVN, PPH) │ │
│  │  ├─ Forum spiders (BHW, WarriorForum, VOZ)         │ │
│  │  └─ Social spiders (TikTok, Facebook Groups)       │ │
│  └──────────────────────┬──────────────────────────────┘ │
│                         ▼                                │
│  ┌─────────────────────────────────────────────────────┐ │
│  │         Workers API Client                           │ │
│  │  POST /api/demand/nap → Lead scoring & storage      │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│         MTK Demand Engines (Workers.dev)                 │
│  ├─ Lead scoring (rubric-lead.js)                       │
│  ├─ Deduplication (chuanhoa.js)                         │
│  ├─ Supabase storage (demand_inbox)                     │
│  └─ Dashboard UI                                        │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Install dependencies

```bash
cd crawl-agent

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate   # Windows

# Install Python packages
pip install -r requirements.txt

# Install Scrapling browsers
scrapling install --force
```

### 2. Configure

```bash
cp .env.example .env
# Edit .env with your settings
```

Key settings:
- `WORKERS_API_URL` — Your Workers API endpoint
- `WORKERS_DEMAND_TOKEN` — Auth token for the API
- `CAMOUFOX_HEADLESS` — Run browser headless (default: true)
- `ENABLE_SOCIAL_MEDIA` — Enable TikTok/Facebook crawling (needs Camoufox)

### 3. Run

```bash
# List configured sources
python main.py list

# Check system health
python main.py health

# Run a single spider
python main.py run -s vlance

# Run all Scrapling spiders
python main.py run-all --engines scrapling_fast,scrapling_stealth

# Run all spiders (including Camoufox social media)
python main.py run-all

# Dry run (don't submit to API)
python main.py run-all --no-submit -o data

# Social media only
python main.py run-social

# Force-run a source blocked by the circuit breaker
python main.py run -s vlance --force
```

### 4. Feedback loop (sau mỗi đợt duyệt lead trên dashboard)

```bash
# Nạp quyết định duyệt/bỏ của người vào prompt phân loại
python scripts/update_feedback.py
```

## Resilience & Safety

| Cơ chế | Làm gì | State |
|---|---|---|
| **Dedup 2 tầng** | Chặn lead trùng trong lô + với DB (RPC `dm_loc_keys_da_co`) trước khi vào inbox | phía server |
| **Baseline reconciliation** | Source từng có links mà 2 run liên tiếp ra 0 → flag `DEGRADED` | `data/source_baseline.json` |
| **Circuit breaker** | 3 run fail liên tiếp → ngừng hammer nguồn đó; `--force` để ép chạy | `data/circuit_state.json` |
| **Retry backoff** | 2s → 4s → … cap 60s, chỉ retry lỗi `retryable` | — |
| **Feedback loop** | Học từ quyết định duyệt lead qua `/api/demand/phan-hoi` | `data/feedback.json` |
| **Error envelope** | Mỗi lỗi có `kind`/`retryable`/`hint`; `blocked` không retry | — |
| **URL guard** | Chặn SSRF (private IP, metadata) + tôn trọng robots.txt | cache theo domain |

Xem chi tiết và hướng dẫn vận hành trong [HARDENING.md](./HARDENING.md).

## Source Configuration

### Freelancer Sites (Scrapling Stealth)
| Source | Engine | Protection |
|--------|--------|------------|
| vLance.vn | Scrapling Stealth | Cloudflare bypass |
| Freelancer.vn | Scrapling Stealth | JS rendering |
| PeoplePerHour | Scrapling Fast | None |

### Marketing Forums (Scrapling Fast)
| Source | Engine | Protection |
|--------|--------|------------|
| BlackHatWorld | Scrapling Fast | Light |
| WarriorForum | Scrapling Fast | Light |
| VOZ Marketing | Scrapling Stealth | Moderate |

### Social Media (Camoufox)
| Source | Engine | Protection |
|--------|--------|------------|
| TikTok | Camoufox | Heavy (fingerprint) |
| Facebook Groups | Camoufox | Very Heavy (login + JS) |

## Engine Selection Logic

```
Site has Cloudflare?
├─ YES → Scrapling Stealth (solve_cloudflare=True)
└─ NO  → Site needs JS rendering?
         ├─ YES → Scrapling Stealth
         └─ NO  → Scrapling Fast (impersonate Chrome)

Site has heavy anti-bot (TikTok/FB)?
└─ YES → Camoufox (fingerprint rotation + human simulation)
```

## Data Flow

1. **Discovery**: Spider fetches listing pages
2. **Extraction**: Parse HTML → extract job links
3. **Detail**: Fetch each job post → extract full content
4. **Format**: Structure as lead payload (matches `nap-lead.js` format)
5. **Submit**: POST to `/api/demand/nap` → Workers scores and stores
6. **Score**: `rubric-lead.js` scores lead (0-100)
7. **Store**: Saved to `demand_inbox` in Supabase
8. **Review**: Christian reviews in dashboard, clicks "Nạp" to merge

## Adding New Sources

1. Create spider in `spiders/` (inherit from `BaseSpider`)
2. Add source config in `config.py`
3. Register spider in `spiders/__init__.py`

```python
# Example: new spider
class MyNewSpider(BaseSpider):
    name = "my_spider"
    source_code = "my_source"
    engine_type = "scrapling_fast"  # or "scrapling_stealth" or "camoufox"

    async def parse_listing(self, content, url):
        # Extract links from listing page
        ...

    async def parse_detail(self, content, url):
        # Extract full content from detail page
        ...
```

## Scheduled Runs

Add to your crontab or use Cloudflare Cron Triggers:

```bash
# Every 6 hours — hot jobs from freelancer sites
0 */6 * * * cd /path/to/crawl-agent && python main.py run-all --engines scrapling_fast,scrapling_stealth

# Every 12 hours — social media (needs more resources)
0 */12 * * * cd /path/to/crawl-agent && python main.py run-social
```

## File Structure

```
crawl-agent/
├── main.py                 # CLI entry point
├── orchestrator.py         # Central coordinator
├── config.py               # All configuration
├── requirements.txt        # Python dependencies
├── .env.example           # Environment template
├── engines/
│   ├── scrapling_engine.py # Fast + Stealth Scrapling
│   └── camoufox_engine.py  # Anti-detect Camoufox
├── spiders/
│   ├── base.py            # Abstract base spider
│   ├── freelancer.py      # vLance, FreelancerVN, PPH
│   ├── forum.py           # BHW, WarriorForum, VOZ
│   └── social.py          # TikTok, Facebook
├── utils/
│   ├── workers_client.py  # Workers API client
│   ├── baseline.py        # Reconciliation: phát hiện spider chết lặng lẽ
│   ├── circuit_breaker.py # Ngừng hammer nguồn thất bại liên tục
│   ├── feedback.py        # Học từ quyết định duyệt lead
│   ├── errors.py          # Error envelope: kind/retryable/hint
│   └── url_guard.py       # SSRF allowlist + robots.txt
├── scripts/
│   └── update_feedback.py # Nạp feedback từ Workers API
├── classify_fast.py       # Batch LLM classifier (marker JOB-xx, feedback)
└── data/                  # Crawl results + state (gitignored)
```

## Integration with Workers.dev

The crawl agent posts leads to your existing Workers API:

```
POST /api/demand/nap
Headers: X-Demand-Token: <token>
Body: {
  "leads": [
    {
      "source": "vlance",
      "url": "https://vlance.vn/du-an/...",
      "noiDung": "Full job description...",
      "tieuDe": "Cần thiết kế logo...",
      "postedAt": "2025-01-15T10:00:00Z"
    }
  ]
}
```

Workers then:
1. Normalizes text (`chuanhoa.js`)
2. Classifies needs (`nhucau.js`)
3. Extracts contacts (`lienhe.js`)
4. Reads budget (`ngansach.js`)
5. Scores lead (`rubric-lead.js`)
6. Stores in `demand_inbox` (Supabase)

## License

Internal use — MTK Demand Engines project.
