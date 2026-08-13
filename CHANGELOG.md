# Changelog

Tất cả các thay đổi quan trọng của project sẽ được ghi lại trong file này.

## [Unreleased]

### Planned
- Bật cron tự động quét mỗi 30 phút
- Fix freelancerviet — đổi sang `browser_run`
- Tìm URL TopCV khác hoặc dùng crawl-agent Python
- Config regex cho vlance

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
