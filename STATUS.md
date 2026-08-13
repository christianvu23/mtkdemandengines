# 📊 Project Status

**Last updated:** 2026-08-13
**Status:** 🟢 OPERATIONAL

---

## 🎯 Current State

### ✅ What Works

- **Pipeline端到端** — Sources → browser_run → Queue → Scoring → Inbox → Dashboard
- **Lead scoring** — Rubric 100 điểm, 6 trục, filter 2 lớp (regex + keyword)
- **50+ leads đã thu thập** và chấm điểm từ vieclam24h
- **API endpoints** — Public (inbox, trang-thai) + Protected (quet, nap)
- **Cron handler** — Fetch sources từ DB, dispatch queue tự động
- **Manual nap** — `/api/demand/nap` lưu trực tiếp vào inbox
- **Dashboard** — GitHub OAuth, nút "Nạp lead mới" merge vào DB chính
- **Leads viewer** — `/leads.html` public, không cần auth
- **Tests** — 106/106 pass

### ⚠️ Known Limitations

- **freelancerviet** — JS-rendered, đã đổi sang `browser_run` (cần test)
- **topcv** — Cloudflare chặn
- **vietnamworks** — Next.js JSON, chưa parse được
- **vlance** — Chưa config regex_link_bai
- **fb_group** — Mặc định tắt (nap_tay)

---

## 🏗️ Architecture

```
Sources (demand_sources table)
    ↓
POST /api/demand/quet → Cloudflare Queue
    ↓
browser_run (CF Browser Rendering) → boc-link.js → tách links
    ↓
Queue: mỗi link = 1 job → fetch detail → nap-lead.js scoring
    ↓
demand_inbox (Supabase staging)
    ↓
Christian bấm "Nạp" → merge_demand_inbox() → demand_leads
```

**Nguyên tắc:** MÁY ĐỀ XUẤT, NGƯỜI BẤM.

---

## 📊 Metrics

| Metric | Value | Status |
|--------|-------|--------|
| Tests passing | 106/106 | ✅ |
| Leads trong inbox | 50+ | ✅ |
| Leads đã chấm điểm | 53+ | ✅ |
| Lần quét thành công | 4+ | ✅ |
| Sources hoạt động | 1/6 (vieclam24h) | ⚠️ |
| Cron auto-scan | Đã fix, chưa bật | ⏳ |

---

## 📋 Pending Tasks

| # | Task | Ưu tiên |
|---|------|---------|
| 1 | Bật cron tự động quét mỗi 30 phút | 🔴 HIGH |
| 2 | Test freelancerviet với browser_run | 🟡 MEDIUM |
| 3 | Tìm URL TopCV khác hoặc dùng crawl-agent | 🟡 MEDIUM |
| 4 | Config regex cho vlance | 🟢 LOW |
| 5 | Phase 3: Split worker.js thành modules nhỏ hơn | 🟢 LOW |

---

## 📞 Contact

**Maintainer:** Christian Vu
**Project:** MTK Demand Engines
**URL:** https://mtkdemandengines.christianvu23.workers.dev
