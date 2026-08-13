# 🚀 Deploy Status

## Production Info

**URL:** https://mtkdemandengines.christianvu23.workers.dev
**Version ID:** d43f03ac-6d52-4a0a-beaa-e2d2003ef2b6
**Deployed at:** 2026-08-13
**Supabase:** `emkwknwcyyewevmmoxzj`

---

## ✅ Deploy Checklist

- [x] Code committed
- [x] Tests passing (106/106)
- [x] Wrangler deploy successful
- [x] Pipeline hoạt động端到端
- [x] 50+ leads đã thu thập
- [x] Cron handler đã fix
- [x] Manual nap endpoint đã fix

---

## 🌐 Truy cập nhanh

| Trang | URL | Auth |
|-------|-----|------|
| Landing | [/](https://mtkdemandengines.christianvu23.workers.dev/) | ❌ Public |
| Dashboard | [/app](https://mtkdemandengines.christianvu23.workers.dev/app) | GitHub OAuth |
| Leads viewer | [/leads.html](https://mtkdemandengines.christianvu23.workers.dev/leads.html) | ❌ Public |
| API Inbox | [/api/demand/inbox](https://mtkdemandengines.christianvu23.workers.dev/api/demand/inbox) | ❌ Public |
| API Trạng thái | [/api/demand/trang-thai](https://mtkdemandengines.christianvu23.workers.dev/api/demand/trang-thai) | ❌ Public |

---

## 🔧 API Endpoints

### Public (không cần auth)

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/demand/inbox` | GET | Xem leads trong inbox |
| `/api/demand/trang-thai` | GET | Xem sources đã config |

### Protected (cần `X-Demand-Token`)

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/demand/quet?nguon=X` | POST | Quét nguồn (queue) |
| `/api/demand/nap` | POST | Nạp lead thủ công → inbox |
| `/api/demand/kiem-tra-transport` | GET | Kiểm tra transport |

### Ví dụ

```bash
# Xem leads (public)
curl https://mtkdemandengines.christianvu23.workers.dev/api/demand/inbox

# Quét nguồn (cần token)
curl -X POST \
  -H "X-Demand-Token: mkt-demangen-2026" \
  https://mtkdemandengines.christianvu23.workers.dev/api/demand/quet?nguon=vieclam24h

# Nạp lead thủ công
curl -X POST \
  -H "X-Demand-Token: mkt-demangen-2026" \
  -H "Content-Type: application/json" \
  -d '{"source":"fb_manual","noiDung":"Cần thiết kế logo...","tieuDe":"Tuyển designer"}' \
  https://mtkdemandengines.christianvu23.workers.dev/api/demand/nap
```

---

## 🔑 Secrets

| Secret | Status |
|--------|--------|
| `SUPABASE_URL` | ✅ `https://emkwknwcyyewevmmoxzj.supabase.co` |
| `SUPABASE_SERVICE_KEY` | ✅ Set |
| `DEMAND_TOKEN` | ✅ `mkt-demangen-2026` |
| `CLOUDFLARE_ACCOUNT_ID` | ✅ Set |
| `CLOUDFLARE_API_TOKEN` | ✅ Set |

---

## 📝 Deploy Log

### 2026-08-13 — Pipeline hoạt động端到端

**Version:** d43f03ac
**Changes:**
- Fix cron handler — fetch sources từ DB, dispatch queue
- Fix `/api/demand/nap` — uncomment napVaoInbox, lưu vào DB
- Fix freelancerviet transport → browser_run
- Remove dead code extractJobInfo()
- Fix suyRaHinhThuc() redundant call
- Pipeline: 50+ leads thu thập, 106 tests pass

### 2026-08-13 — Filtering fix

**Version:** 30538c9
**Changes:**
- Loại bỏ sales/business jobs, chỉ giữ marketing-related
- Cập nhật regex vieclam24h
- 81 jobs quét được, 4 leads đạt

---

**Last updated:** 2026-08-13
