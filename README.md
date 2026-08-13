# MTK Demand Engines

Hệ thống quét và chấm điểm nhu cầu Marketing/Branding/Social tại Việt Nam.

## 🚀 Deploy Status

**Production:** https://mtkdemandengines.christianvu23.workers.dev  
**Dashboard:** https://mtkdemandengines.christianvu23.workers.dev/crawl-dashboard.html  
**Last Deploy:** 2025-01-15  
**Version:** 011a0dd3-7ef7-4bfd-a3b5-247628c9a19e

---

## 📋 Tổng quan

### Nguyên tắc hoạt động

**MÁY ĐỀ XUẤT, NGƯỜI BẤM.**

Worker chỉ đẩy lead vào `demand_inbox`. Việc merge vào bảng chính do Christian bấm nút trong UI — vì hàm merge yêu cầu JWT với write quyền, và `service_role` thì `auth.uid()` rỗng.

### Luồng dữ liệu

```
Sources (vLance, forums, social)
    ↓
Crawl Agent (Python + Scrapling + Camoufox)
    ↓
POST /api/crawl/submit
    ↓
nap-lead.js pipeline (chấm điểm, phân loại)
    ↓
demand_inbox (Supabase)
    ↓
Christian review → bấm "Nạp" → demand_leads
```

---

## 🕷️ Crawl Agent

### Kiến trúc

Hybrid **Scrapling + Camoufox** agent:

- **Scrapling Fast** — Forums, sites không anti-bot (impersonate Chrome)
- **Scrapling Stealth** — Sites có Cloudflare (vLance, VOZ)
- **Camoufox** — TikTok, Facebook (fingerprint rotation + human simulation)

### Sources đã cấu hình

| Source | Engine | Status | Notes |
|--------|--------|--------|-------|
| vLance.vn | Scrapling Stealth | ⚠️ 403 blocked | Cần Browser Rendering API |
| BlackHatWorld | Scrapling Fast | ⚠️ 403 blocked | Cần Browser Rendering API |
| WarriorForum | Scrapling Fast | ✅ Accessible | Selectors cần update |
| Freelancer.vn | Scrapling Stealth | ❌ Not tested | |
| PeoplePerHour | Scrapling Fast | ❌ Not tested | |
| TikTok | Camoufox | ❌ Not tested | Cần setup Camoufox server |
| Facebook Groups | Camoufox | ❌ Not tested | Cần login session |

### Test kết quả thực tế

```bash
# Test local
node -e "
import('./src/sources/freelance-crawler.js').then(async (mod) => {
  const result = await mod.crawlSource('vlance', {});
  console.log('vLance:', result.total, 'items');
});
"

# Kết quả:
# vLance: 0 items (HTTP 403 - blocked)
# BHW: 0 items (HTTP 403 - blocked)
# WarriorForum: 0 items (selectors sai)
```

**Vấn đề:** Các sites đều block hoặc không extract được data.

**Giải pháp:**
1. **Browser Rendering API** — Cần `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN`
2. **Update selectors** — Fetch HTML thật để xem cấu trúc DOM
3. **Camoufox** — Setup server riêng cho TikTok/Facebook

---

## 🛠️ API Endpoints

### Crawl API

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/crawl/status` | GET | Xem trạng thái crawl |
| `/api/crawl/sources` | GET | List sources đã cấu hình |
| `/api/crawl/run` | POST | Trigger crawl |
| `/api/crawl/results` | GET | Xem crawl results |
| `/api/crawl/leads` | GET | Xem job leads đã filter |

### Demand API

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/demand/nap` | POST | Nạp lead thủ công |
| `/api/demand/quet` | POST | Quét nguồn (queue) |
| `/api/demand/trang-thai` | GET | Xem trạng thái sources |
| `/api/demand/inbox` | GET | Xem leads trong inbox |

Tất cả endpoints cần header `X-Demand-Token`.

---

## 📁 Cấu trúc project

```
mtkdemandengines/
├── worker.js                    # Cloudflare Worker entry point
├── wrangler.toml               # Workers config
├── package.json                # Dependencies
│
├── src/
│   ├── core/                   # Core logic (pure functions)
│   │   ├── nap-lead.js        # Lead scoring pipeline
│   │   ├── rubric-lead.js     # Chấm điểm lead (0-100)
│   │   ├── boc-link.js        # Tách link từ trang danh sách
│   │   ├── chuanhoa.js        # Chuẩn hóa text
│   │   ├── nhucau.js          # Phân loại nhu cầu
│   │   ├── lienhe.js          # Trích xuất liên hệ
│   │   ├── ngansach.js        # Đọc ngân sách
│   │   └── tuoi.js            # Tính tuổi lead
│   │
│   ├── sources/               # Crawl sources
│   │   ├── freelance-crawler.js  # Freelance/Forum crawler
│   │   ├── vlance.js          # vLance scraper (Playwright)
│   │   └── playwright.js      # Playwright transport
│   │
│   ├── transport/             # Transport layer
│   │   ├── index.js           # Fetch + fallback logic
│   │   ├── crawl-api.js       # Crawl API endpoints
│   │   └── crawl-agent.js    # Python agent bridge
│   │
│   ├── queue/                 # Queue handlers
│   │   └── handlers.js        # Process queue jobs
│   │
│   └── services/              # External services
│       └── supabase.js        # Supabase I/O
│
├── crawl-agent/               # Python crawl agent
│   ├── main.py                # CLI entry point
│   ├── orchestrator.py        # Coordinator
│   ├── config.py              # Configuration
│   ├── engines/
│   │   ├── scrapling_engine.py   # Fast + Stealth
│   │   └── camoufox_engine.py    # Anti-detect browser
│   ├── spiders/
│   │   ├── base.py            # Base spider
│   │   ├── freelancer.py      # vLance, FreelancerVN
│   │   ├── forum.py           # BHW, WarriorForum, VOZ
│   │   └── social.py          # TikTok, Facebook
│   └── tests/
│       ├── test_smoke.py      # Smoke tests
│       └── test_architecture_review.py
│
├── public/                    # Static assets
│   ├── index.html            # Landing page
│   ├── app.html              # Main app
│   └── crawl-dashboard.html  # Crawl dashboard
│
├── tests/                     # Unit tests
│   ├── nap-lead.test.js
│   ├── boc-link.test.js
│   ├── transport.test.js
│   └── crawl-agent-bridge.test.js
│
└── docs/
    ├── CRAWL-GUIDE.md         # Hướng dẫn crawl
    ├── DEPLOYED.md            # Deploy info
    └── VERIFICATION_REPORT.md # Test results
```

---

## 🧪 Tests

### Chạy tests

```bash
# Tất cả tests
npm test

# Chỉ crawl agent tests
node --test tests/crawl-agent-bridge.test.js

# Python smoke tests
cd crawl-agent
PYTHONIOENCODING=utf-8 python3 -m unittest tests.test_smoke -v
```

### Test coverage

- ✅ Lead scoring pipeline (rubric-lead.js)
- ✅ Link extraction (boc-link.js)
- ✅ Transport layer
- ✅ Crawl API bridge
- ⚠️ Spider logic (cần dependencies)
- ❌ Camoufox engine (cần browser)

---

## 🔧 Setup & Development

### Prerequisites

- Node.js 20+
- Python 3.10+ (cho crawl agent)
- Cloudflare account (Workers)
- Supabase account (database)

### Install

```bash
# Node dependencies
npm install

# Python dependencies (crawl agent)
cd crawl-agent
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
scrapling install --force
```

### Local development

```bash
# Start Workers dev server
npx wrangler dev

# Access dashboard
open http://localhost:8787/crawl-dashboard.html
```

### Deploy

```bash
npx wrangler deploy
```

---

## 🔑 Secrets

Cần setup các secrets trong Workers:

```bash
npx wrangler secret put DEMAND_TOKEN
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_KEY

# Optional: Browser Rendering API
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID
npx wrangler secret put CLOUDFLARE_API_TOKEN
```

---

## 📊 Lead Scoring

### Rubric (0-100 điểm)

| Tiêu chí | Trọng số | Mô tả |
|----------|----------|-------|
| Độ tươi | 25 | Lead mới có giá trị hơn |
| Khả năng liên hệ | 20 | Có SĐT/Zalo/Email |
| Độ cụ thể | 20 | Mô tả rõ ràng, chi tiết |
| Khớp dịch vụ | 15 | Phù hợp với dịch vụ của Christian |
| Tín hiệu ngân sách | 12 | Có đề cập ngân sách |
| Hình thức | 8 | Retainer > Dự án > Tuyển dụng |

### Tier classification

- **Tier A (75-100):** Lead nóng, cần liên hệ ngay
- **Tier B (60-74):** Lead tiềm năng, liên hệ trong 24h
- **Tier C (45-59):** Lead ấm, liên hệ trong tuần
- **Tier D (<45):** Lead lạnh, ưu tiên thấp

---

## 📝 Documentation

- [CRAWL-GUIDE.md](CRAWL-GUIDE.md) — Hướng dẫn crawl data
- [DEPLOYED.md](DEPLOYED.md) — Thông tin deploy
- [VERIFICATION_REPORT.md](crawl-agent/VERIFICATION_REPORT.md) — Test results
- [KIEN-TRUC.md](KIEN-TRUC.md) — Kiến trúc hệ thống
- [CAU-HINH-VA-SECRET.md](CAU-HINH-VA-SECRET.md) — Cấu hình secrets

---

## 🐛 Known Issues

### 1. Sites block bot (403)

**Vấn đề:** vLance, BlackHatWorld block non-browser requests.

**Giải pháp:**
- Setup Browser Rendering API credentials
- Hoặc dùng Python crawl agent với Scrapling Stealth

### 2. Selectors sai

**Vấn đề:** CSS selectors là guesses, chưa verify với HTML thật.

**Giải pháp:**
- Fetch HTML thật từ sites
- Update selectors trong `src/sources/freelance-crawler.js`

### 3. Camoufox chưa test

**Vấn đề:** TikTok/Facebook cần Camoufox nhưng chưa setup.

**Giải pháp:**
- Setup Camoufox server riêng
- Test với TikTok trước khi dùng production

---

## 📈 Next Steps

1. **Setup Browser Rendering API** — Thêm credentials để bypass anti-bot
2. **Update selectors** — Fetch HTML thật và update CSS selectors
3. **Test Camoufox** — Setup và test với TikTok/Facebook
4. **Add more sources** — Thêm forums/sites khác
5. **Setup cron** — Tự động crawl định kỳ
6. **Monitor results** — Theo dõi hiệu quả qua thời gian

---

## 📄 License

Internal use — MTK Demand Engines project.

---

**Last updated:** 2025-01-15  
**Maintainer:** Christian Vu
