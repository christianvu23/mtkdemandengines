# 📋 Tóm Tắt Tình Hình — 2026-08-13

## ✅ Đã Hoàn Thành

### Pipeline hoạt động端到端
- **Sources → browser_run → Queue → Scoring → Inbox → Dashboard**
- 50+ leads đã thu thập và chấm điểm
- 106/106 tests pass
- 4+ lần quét thành công (vieclam24h)

### API Endpoints
| Endpoint | Auth | Trạng thái |
|----------|------|------------|
| `/api/demand/inbox` | Public | ✅ |
| `/api/demand/trang-thai` | Public | ✅ |
| `/api/demand/quet` | Token | ✅ |
| `/api/demand/nap` | Token | ✅ (đã fix lưu DB) |

### Giao diện
- Landing page `/` — Public
- Dashboard `/app` — GitHub OAuth, merge lead vào DB
- Leads viewer `/leads.html` — Public

### Bug fixes (session 2026-08-13)
1. ✅ Fix cron handler — fetch sources từ DB, dispatch queue
2. ✅ Fix `/api/demand/nap` — uncomment napVaoInbox, lưu DB
3. ✅ Fix freelancerviet transport → browser_run
4. ✅ Remove dead code extractJobInfo()
5. ✅ Fix suyRaHinhThuc() gọi phanLoaiNhuCau() 2 lần
6. ✅ Fix filtering — loại sales/business, giữ marketing
7. ✅ Fix regex vieclam24h

---

## 🏗️ Kiến trúc

```
demand_sources (Supabase) → POST /api/demand/quet
    ↓
Cloudflare Queue → browser_run → boc-link.js
    ↓
Queue: mỗi link = 1 job → nap-lead.js scoring (100 điểm, 6 trục)
    ↓
demand_inbox → Christian bấm "Nạp" → demand_leads
```

**Nguyên tắc:** MÁY ĐỀ XUẤT, NGƯỜI BẤM

### Rubric chấm điểm (100 điểm)
| Trục | Điểm |
|------|------|
| Độ tươi | 25 |
| Khả năng liên hệ | 20 |
| Độ cụ thể | 20 |
| Độ khớp dịch vụ | 15 |
| Tín hiệu ngân sách | 12 |
| Hình thức hợp tác | 8 |
| Phạt cạnh tranh | -10 max |

**Tiers:** A ≥75, B 60-74, C 45-59, D <45

---

## ⏳ Chưa Hoàn Thành

| Task | Ưu tiên | Ghi chú |
|------|---------|---------|
| Bật cron auto-scan (30 phút) | 🔴 HIGH | Code đã fix, cần uncomment trong wrangler.toml |
| Test freelancerviet + browser_run | 🟡 MEDIUM | JS-rendered site |
| Tìm URL TopCV khác | 🟡 MEDIUM | Cloudflare chặn |
| Config regex vlance | 🟢 LOW | |
| Split worker.js (Phase 3) | 🟢 LOW | |

---

## 🔑 Secrets & Config

- **Supabase:** `emkwknwcyyewevmmoxzj`
- **Worker:** `mtkdemandengines` (christianvu23)
- **Token:** `mkt-demangen-2026`
- **URL:** https://mtkdemandengines.christianvu23.workers.dev

---

## 📁 Cấu trúc code

```
worker.js              → Entry point (HTTP + Queue + Cron)
src/core/              → Pure logic (nap-lead, rubric, boc-link, nhucau...)
src/queue/handlers.js  → Queue job processing
src/services/supabase.js → Supabase I/O
src/transport/index.js → Transport layer (truc_tiep → browser_run → unlocker)
db/migrations/         → SQL migrations (6 bảng, triggers, RLS)
public/                → HTML pages (landing, app, leads)
tests/                 → 106 tests
```

---

**Status:** 🟢 OPERATIONAL
**Next:** Bật cron, test thêm sources
