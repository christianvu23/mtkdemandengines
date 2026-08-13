# Session State - mtkdemandengines Project

**Opened:** 2026-08-13 | **Last updated:** 2026-08-13

## 📊 TRẠNG THÁI HIỆN TẠI

### ✅ Live site hoạt động
- **URL:** https://mtkdemandengines.christianvu23.workers.dev
- **Trang chủ:** HTTP 200, 12,961 chars HTML
- **Dashboard /app:** HTTP 200, 37,095 chars HTML
- **API endpoints:**
  - `/api/demand/trang-thai` → 200 OK, trả về 6 nguồn từ Supabase
  - `/api/demand/kiem-tra-transport` → 200 OK, `ket_qua: true`
  - `/api/demand/nap` → cần DEMAND_TOKEN
  - `/api/demand/quet` → cần DEMAND_TOKEN + QUEUE_QUET binding

### 🔑 Secrets đã cấu hình
| Secret | Trạng thái |
|--------|-----------|
| `SUPABASE_URL` | ✅ `https://emkwknwcyyewevmmoxzj.supabase.co` |
| `SUPABASE_SERVICE_KEY` | ✅ JWT service_role (valid) |
| `DEMAND_TOKEN` | ✅ `mkt-demangen-2026` |
| `CLOUDFLARE_ACCOUNT_ID` | ✅ Đã set (cho browser_run) |
| `CLOUDFLARE_API_TOKEN` | ✅ Đã set (cho browser_run) |

### 📦 6 Demand Sources trong DB
| Mã | Tên | Transport | URL danh sách | Bật? |
|----|-----|-----------|---------------|------|
| `topcv` | TopCV | truc_tiep | ❌ chưa config | ✅ |
| `vietnamworks` | VietnamWorks | truc_tiep | ❌ chưa config | ✅ |
| `vieclam24h` | Vieclam24h | truc_tiep | ❌ chưa config | ✅ |
| `freelancerviet` | FreelancerViet.vn | truc_tiep | ✅ có regex | ✅ |
| `vlance` | vLance.vn | browser_run | ✅ | ✅ |
| `fb_group` | Facebook Groups | nap_tay | ❌ | ❌ (mặc định tắt) |

## 🧪 TESTS
- **92/92 tests pass** ✅
- Coverage: boc-link, chuanhoa, mcp, nap-lead, rubric-router, transport, trich-xuat, worker-queue

## 🐛 BUGS FIXED TRONG SESSION NÀY
1. `worker.js` có markdown fence nhúng trong JS code → removed
2. `nhanPhien()` gọi nhưng không define → thay bằng inline runLabel
3. `handlers.js` bắt đầu bằng markdown fence → viết lại clean
4. `extractJobInfo` dùng `DOMParser` (không có trong Workers) → rewrite bằng regex
5. `duocPhep(request)` đọc `request.env` (undefined) → truyền `env` param
6. `supabase.js` đọc `process.env` (Node.js) → đọc từ `env` (Workers)
7. `/api/demand/trang-thai` là stub → query thật từ Supabase

## 📋 PENDING TASKS
| # | Task | Ưu tiên |
|---|------|---------|
| 1 | Config `url_danh_sach` cho topcv, vietnamworks, vieclam24h | 🔴 HIGH |
| 2 | Fine-tune `transport_fallback` cho toàn bộ sources | 🟡 MEDIUM |
| 3 | Bật cron trigger (hiện đang comment trong wrangler.toml) | 🟡 MEDIUM |
| 4 | Mở rộng test coverage cho extractJobInfo | 🟢 LOW |
| 5 | Phase 3: Split worker.js thành modules nhỏ hơn | 🟢 LOW |

## 🔒 BẢO MẬT
- Supabase service_role key đã set trên Workers secret — **KHÔNG commit vào repo**
- GitHub OAuth Client ID/Secret đã cung cấp — cần xem xét rotate nếu bị lộ
- DEMAND_TOKEN `mkt-demangen-2026` — nên đổi nếu bị lộ

---
*Session resumed from previous work. Previous state archived.*
