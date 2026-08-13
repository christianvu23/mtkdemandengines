# MTK Demand Engines

Hệ thống quét và chấm điểm nhu cầu Marketing/Branding/Social tại Việt Nam.

## 🚀 Deploy Status

**Production:** https://mtkdemandengines.christianvu23.workers.dev  
**Last Deploy:** 2026-08-13  
**Version ID:** d43f03ac-6d52-4a0a-beaa-e2d2003ef2b6  
**Status:** ✅ Pipeline hoạt động端到端

---

## 📋 Tổng quan

### Nguyên tắc hoạt động

**MÁY ĐỀ XUẤT, NGƯỜI BẤM.**

Worker chỉ đẩy lead vào `demand_inbox`. Việc merge vào bảng chính do Christian bấm nút trong UI — vì hàm merge yêu cầu JWT với write quyền, và `service_role` thì `auth.uid()` rỗng.

### Luồng dữ liệu (ĐÃ HOẠT ĐỘNG)

```
Sources (vieclam24h, vlance, freelancerviet)
    ↓
browser_run (Cloudflare Browser Rendering API)
    ↓
Queue (Cloudflare Queues)
    ↓
nap-lead.js pipeline (chấm điểm, phân loại)
    ↓
demand_inbox (Supabase)
    ↓
Christian review → bấm "Nạp" → demand_leads
```

---

## 🌐 Truy cập nhanh

| Trang | URL | Auth | Mô tả |
|-------|-----|------|-------|
| **Leads Viewer** | [/leads.html](https://mtkdemandengines.christianvu23.workers.dev/leads.html) | ❌ Public | Xem nhanh leads từ inbox |
| **Dashboard** | [/app](https://mtkdemandengines.christianvu23.workers.dev/app) | GitHub OAuth | Duyệt lead, merge vào DB chính |
| **API Inbox** | [/api/demand/inbox](https://mtkdemandengines.christianvu23.workers.dev/api/demand/inbox) | ❌ Public | JSON leads từ inbox |
| **API Trạng thái** | [/api/demand/trang-thai](https://mtkdemandengines.christianvu23.workers.dev/api/demand/trang-thai) | ❌ Public | Xem sources đã config |

---

## 🕷️ Sources đã cấu hình

| Mã | Tên | Transport | URL | Trạng thái |
|----|-----|-----------|-----|------------|
| `vieclam24h` | Vieclam24h | `browser_run` | ✅ Configured | ✅ Hoạt động |
| `freelancerviet` | FreelancerViet.vn | `truc_tiep` | ✅ Configured | ⚠️ JS-rendered |
| `vlance` | vLance.vn | `browser_run` | ✅ Configured | ⏳ Chưa test |
| `topcv` | TopCV | `browser_run` | ✅ Configured | ❌ Cloudflare chặn |
| `vietnamworks` | VietnamWorks | `browser_run` | ✅ Configured | ❌ Next.js JSON |
| `fb_group` | Facebook Groups | `nap_tay` | ❌ | ❌ Mặc định tắt |

---

## 📊 Kết quả thực tế

### Pipeline hoạt động

```bash
# Quét vieclam24h
POST /api/demand/quet?nguon=vieclam24h
→ 20 job detail pages
→ Queue xử lý từng job
→ Chấm điểm và lưu vào inbox
```

### Leads đã thu thập

| Metric | Giá trị |
|--------|---------|
| **Tổng items trong inbox** | 50+ |
| **Tổng leads đã chấm điểm** | 55+ |
| **Lần quét thành công** | 5+ |

### Ví dụ leads (SAU KHI FIX)

**✅ Được giữ lại (marketing-related):**
```
[D|44] Tuyển Nhân Viên Quay Phim tại Phòng Khám Chuyên Khoa Thẩm Mỹ Kyoto Nhật Bản
  Nhu cầu: content, video, pr | Source: vieclam24h

[D|40] Tuyển Nhân Viên Content Creator tại Công Ty Cổ Phần Fandi Việt Nam
  Nhu cầu: content, video, branding, ads | Source: vieclam24h

[D|40] Tuyển Chuyên Viên Digital Marketing tại Công Ty TNHH Nha Khoa An Phước
  Nhu cầu: content, video, branding, ads | Source: vieclam24h
```

**❌ Bị loại (sales/business - không liên quan):**
```
Tuyển Giám Đốc Kinh Doanh Khu Vực Đông Bắc
  → Lý do: Ngoài phạm vi: giam doc kinh doanh, kinh doanh

Tuyển Nhân Viên Sales Thu Nhập Lên Đến 20 Triệu
  → Lý do: Ngoài phạm vi: sales

Tuyển Nhân Viên Kinh Doanh Xe Ô Tô
  → Lý do: Ngoài phạm vi: nhan vien kinh doanh, kinh doanh
```

---

## 🛠️ API Endpoints

### Public (không cần auth)

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/demand/inbox` | GET | Xem leads trong inbox |
| `/api/demand/trang-thai` | GET | Xem sources đã config |

### Protected (cần `X-Demand-Token`)

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/demand/quet` | POST | Quét nguồn (queue) |
| `/api/demand/nap` | POST | Nạp lead thủ công |
| `/api/demand/kiem-tra-transport` | GET | Kiểm tra transport |

### Ví dụ sử dụng

```bash
# Xem leads (public)
curl https://mtkdemandengines.christianvu23.workers.dev/api/demand/inbox

# Quét nguồn (cần token)
curl -X POST \
  -H "X-Demand-Token: mkt-demangen-2026" \
  https://mtkdemandengines.christianvu23.workers.dev/api/demand/quet?nguon=vieclam24h
```

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
│   │   ├── vlance.js          # vLance scraper (Playwright)
│   │   └── playwright.js      # Playwright transport
│   │
│   ├── transport/             # Transport layer
│   │   └── index.js           # Fetch + fallback logic
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
│   ├── engines/
│   │   ├── scrapling_engine.py   # Fast + Stealth
│   │   └── camoufox_engine.py    # Anti-detect browser
│   └── spiders/
│       ├── freelancer.py      # vLance, FreelancerVN
│       ├── forum.py           # BHW, WarriorForum, VOZ
│       └── social.py          # TikTok, Facebook
│
├── public/                    # Static assets
│   ├── index.html            # Landing page
│   ├── app.html              # Dashboard (có nút "Xem Inbox")
│   └── leads.html            # Leads viewer (public)
│
├── tests/                     # Unit tests (106 tests pass)
│   ├── nap-lead.test.js
│   ├── boc-link.test.js
│   ├── transport.test.js
│   └── worker-queue.test.js
│
└── docs/
    ├── KIEN-TRUC.md          # Kiến trúc hệ thống
    ├── CAU-HINH-VA-SECRET.md # Cấu hình secrets
    └── SESSION-STATE.md      # Trạng thái session
```

---

## 🧪 Tests

### Chạy tests

```bash
# Tất cả tests (106 tests)
npm test

# Hoặc dùng node trực tiếp
node --test tests/*.test.js
```

### Test coverage

- ✅ Lead scoring pipeline (rubric-lead.js)
- ✅ Link extraction (boc-link.js)
- ✅ Transport layer (fallback logic)
- ✅ Queue handlers
- ✅ Worker API routes
- ✅ Text normalization
- ✅ Contact extraction
- ✅ Budget parsing

**Kết quả:** 106/106 tests pass ✅

---

## 🔧 Setup & Development

### Prerequisites

- Node.js 20+
- Cloudflare account (Workers)
- Supabase account (database)

### Install

```bash
npm install
```

### Local development

```bash
# Start Workers dev server
npx wrangler dev

# Access dashboard
open http://localhost:8787/app
```

### Deploy

```bash
npx wrangler deploy
```

---

## 🔑 Secrets

Đã setup trong Workers:

```bash
# Required
SUPABASE_URL=https://emkwknwcyyewevmmoxzj.supabase.co
SUPABASE_SERVICE_KEY=<JWT service_role>
DEMAND_TOKEN=mkt-demangen-2026

# Optional (cho browser_run)
CLOUDFLARE_ACCOUNT_ID=<account_id>
CLOUDFLARE_API_TOKEN=<api_token>
```

---

## 📊 Lead Scoring

### Filtering Logic (2 lớp)

**Lớp 1: Regex ở tầng source**
- Chỉ lấy URLs có từ khóa marketing: `marketing|content|video|design|quay|chup|tvc|banner|branding|ads|media|digital`
- Giảm noise từ sales/business jobs ngay từ đầu

**Lớp 2: Keyword filtering ở tầng scoring**
- Loại bỏ thẳng tay jobs có từ khóa: `sales`, `kinh doanh`, `giam doc kinh doanh`, `ban hang`, etc.
- Loại bỏ jobs không có nhu cầu marketing nào được phát hiện
- Giữ lại jobs có: `content`, `video`, `design`, `branding`, `ads`, `marketing`, etc.

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

## 🐛 Bugs đã fix (session 2026-08-13)

1. ✅ `worker.js` có markdown fence nhúng trong JS code
2. ✅ `nhanPhien()` gọi nhưng không define
3. ✅ `handlers.js` bắt đầu bằng markdown fence
4. ✅ `extractJobInfo` dùng `DOMParser` (không có trong Workers)
5. ✅ `duocPhep(request)` đọc `request.env` (undefined)
6. ✅ `supabase.js` đọc `process.env` (Node.js) thay vì `env` (Workers)
7. ✅ `/api/demand/trang-thai` là stub → query thật từ Supabase
8. ✅ `/api/demand/quet` không fetch config từ DB
9. ✅ Queue jobs không được gửi → enable sendBatch
10. ✅ `napVaoInbox` bị comment → enable
11. ✅ Regex không khớp relative URLs
12. ✅ HTML tags bị strip sai cách → fix `goMarkdown`
13. ✅ Title hiển thị `<!DOCTYPE html...` → parse frontmatter
14. ✅ **Filtering logic**: Loại bỏ sales/business jobs, chỉ giữ marketing-related leads

---

## 📈 Next Steps

1. **Bật cron** tự động quét mỗi 30 phút
2. **Fix freelancerviet** — đổi sang `browser_run`
3. **Tìm URL TopCV** khác hoặc dùng crawl-agent Python
4. **Config regex** cho vlance
5. **Phase 3:** Split worker.js thành modules nhỏ hơn

---

## 📝 Documentation

- [KIEN-TRUC.md](KIEN-TRUC.md) — Kiến trúc hệ thống
- [CAU-HINH-VA-SECRET.md](CAU-HINH-VA-SECRET.md) — Cấu hình secrets
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) — Kế hoạch triển khai
- [SESSION-STATE.md](SESSION-STATE.md) — Trạng thái session hiện tại

---

## 📄 License

Internal use — MTK Demand Engines project.

---

**Last updated:** 2026-08-13  
**Maintainer:** Christian Vu  
**Pipeline Status:** ✅ Hoạt động端到端
