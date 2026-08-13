# Changelog

Tất cả các thay đổi quan trọng của project sẽ được ghi lại trong file này.

## [2026-08-14] Crawl Agent Hardening

Chi tiết: [`crawl-agent/HARDENING.md`](./crawl-agent/HARDENING.md)

### Added
- **Idempotent submit (CRITICAL)**: RPC `dm_loc_keys_da_co` + `napVaoInboxLocTrung()` chặn lead trùng tại cả 3 cổng nạp (`/api/demand/nap`, `/api/crawl/submit`, queue cron) — đã smoke test trên production
- **Reconciliation baseline**: source từng có links mà 2 run liên tiếp ra 0 → flag `DEGRADED`; `BaseSpider` trả `parse_confidence`
- **Circuit breaker + exponential backoff**: 3 run fail liên tiếp → ngừng hammer nguồn; `fetch_with_retry()` hiện thực hóa `CRAWL_MAX_RETRIES` (trước là config chết); CLI thêm `--force`
- **Feedback loop**: `GET /api/demand/phan-hoi` + `scripts/update_feedback.py` — bộ phân loại học từ quyết định duyệt lead trên dashboard
- **URL guard**: chặn SSRF (private IP, localhost, 169.254.169.254) + tôn trọng robots.txt trước mọi fetch
- **Error recovery contract**: mọi lỗi có `kind`/`retryable`/`hint`; lỗi `blocked` không retry
- Migration `20260814_loc_trung_inbox.sql` (đã áp dụng lên production)

### Fixed
- **classify_fast.py**: match kết quả LLM theo marker `JOB-xx` 1:1 (lệch → fallback cả batch), bỏ `confidence: 0.8` hardcode, bỏ `global BATCH_SIZE` mutation
- **`/api/demand/nap` response**: thêm `trung_lead_key` + `loc_trung_kha_dung` để biết dedup phía DB có đang bật không

### Verified
- JS 117 tests pass · Python 75 tests pass
- robots.txt thực tế: vlance, blackhatworld, peopleperhour, freelancerviet, topcv đều cho phép crawl
- Worker deployed: version `00e911bc`

## [Unreleased]

### Added
- **Bật cron tự động quét** `*/30 * * * *` — Worker giờ tự động fetch sources từ DB và dispatch queue mỗi 30 phút
- **MCP server 6 browser tools mới**: `browser_navigate`, `browser_extract_links`, `browser_extract_content`, `browser_click`, `browser_wait`, `browser_scrape_pipeline`

### Fixed
- **FK constraint `demand_leads_source_fkey`**: Thêm `fb_manual` vào `demand_sources` — inbox có lead `source=fb_manual` (nạp thủ công từ Facebook) nhưng DB không có → merge fail
- **Cron handler**: `scheduled()` giờ fetch sources từ DB rồi dispatch queue (trước đó gọi `xuLyQuetNguon({}, env)` với empty object → luôn skip)
- **`/api/demand/nap`**: Uncomment `napVaoInbox()` — endpoint giờ lưu lead vào DB thay vì chỉ trả preview
- **freelancerviet transport**: `truc_tiep` → `browser_run` (site JS-rendered)
- **Dead code**: Xóa `extractJobInfo()` không được gọi trong handlers.js
- **Redundant call**: `suyRaHinhThuc()` nhận pre-computed `phanLoai` từ `napLead()`, tránh gọi `phanLoaiNhuCau()` 2 lần
- **Supabase project migration**: Cập nhật tất cả references từ `dlzhcfrojibpscozdmrx` → `emkwknwcyyewevmmoxzj` (app.html, wrangler.toml, HUONG-DAN-DEPLOY.md, mcp/README.md)
- **MCP tests**: Cập nhật kỳ vọng từ 6 → 12 tools (thêm 6 browser tools)

### Planned
- Fix freelancerviet — đã đổi transport sang `browser_run`, cần test thực tế
- Tìm URL TopCV khác hoặc dùng crawl-agent Python
- Config regex cho vlance (hiện dùng suy luận cấu trúc)

---

## [2026-08-13-fix2] - Fix filtering logic

### Fixed
- **Filtering logic**: Loại bỏ sales/business jobs, chỉ giữ marketing-related leads
- Thêm `sales`, `kinh doanh`, `giam doc kinh doanh` vào `TU_KHOA_NGOAI_PHAM_VI`
- Thêm `marketing` vào `TU_KHOA_NHU_CAU.content`
- `napLead` giờ reject leads có `ngoaiPhamVi` keywords
- `napLead` giờ reject leads không có nhu cầu marketing nào
- Cập nhật regex vieclam24h để chỉ match marketing-related URLs

### Changed
- Regex vieclam24h: `/(marketing|content|video|design|quay|chup|tvc|banner|branding|ads|media|digital).+id[0-9]+.html`
- Kết quả: 8 links → 3 marketing leads (vs 20 links → 1 lead trước đó)

---

## [2026-08-13] - Pipeline hoạt động端到端

### Added
- ✅ `/leads.html` - Trang xem leads public (không cần auth)
- ✅ `/api/demand/inbox` - API endpoint xem leads từ inbox (public)
- ✅ Nút "Xem Inbox" trên dashboard `/app`
- ✅ Parse frontmatter YAML từ browser_run output
- ✅ Strip HTML tags trước khi xử lý markdown

### Fixed
- `worker.js` có markdown fence nhúng trong JS code
- `nhanPhien()` gọi nhưng không define → thay bằng inline `runLabel`
- `handlers.js` bắt đầu bằng markdown fence → viết lại clean
- `extractJobInfo` dùng `DOMParser` (không có trong Workers) → rewrite bằng regex
- `duocPhep(request)` đọc `request.env` (undefined) → truyền `env` param
- `supabase.js` đọc `process.env` (Node.js) → đọc từ `env` (Workers)
- `/api/demand/trang-thai` là stub → query thật từ Supabase
- `/api/demand/quet` không fetch config từ DB → fix
- Queue jobs không được gửi → enable `sendBatch`
- `napVaoInbox` bị comment → enable
- Regex không khớp relative URLs → fix pattern
- HTML tags bị strip sai cách → fix `goMarkdown`
- Title hiển thị `<!DOCTYPE html...` → parse frontmatter

### Changed
- `/api/demand/inbox` và `/api/demand/trang-thai` thành public (không cần token)
- `/api/demand/quet` fetch source config từ DB thay vì chỉ nhận `ma_nguon`
- `goMarkdown` strip HTML tags trước, rồi mới xử lý markdown
- `doanTieuDe` parse frontmatter YAML trước, rồi heading, rồi fallback

### Results
- 50+ leads đã thu thập và chấm điểm
- 106/106 tests pass
- Pipeline hoạt động: Sources → browser_run → Queue → Chấm điểm → Inbox → Dashboard

---

## [2026-08-11] - Skills system completion

### Added
- 6 skills implementations (archify, code-review, improve-codebase-architecture)
- Transport fallback configuration
- Unit tests for transport layer (5 tests)
- Unit tests for classification logic (9 tests)

### Fixed
- Transport timeout constants
- Queue consumer error handling

---

## [2026-08-09] - Phase 2: Worker refactoring

### Added
- `src/queue/handlers.js` - Queue job processing
- `src/services/supabase.js` - Supabase I/O layer
- `src/transport/index.js` - Transport layer with fallback
- Unit tests for core modules

### Changed
- Split `worker.js` thành nhiều modules
- Extract HTTP routes, queue handlers, services

---

## [2026-08-08] - Initial setup

### Added
- Cloudflare Worker setup
- Supabase integration
- Basic lead scoring pipeline
- Landing page và dashboard

---

**Format:** Keep a Changelog (https://keepachangelog.com/)
