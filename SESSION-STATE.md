# Session State - mtkdemandengines Project

**Opened:** 2026-08-13 | **Last updated:** 2026-08-13

## 📊 TRẠNG THÁI HIỆN TẠI

### ✅ Live site hoạt động hoàn chỉnh
- **URL:** https://mtkdemandengines.christianvu23.workers.dev
- **Trang chủ:** HTTP 200, 13,907 chars HTML
- **Dashboard /app:** HTTP 200, 41,053 chars HTML (có nút "Xem Inbox")
- **Leads viewer /leads.html:** HTTP 200, 9,679 chars HTML (không cần auth)

### 🔑 Secrets đã cấu hình
| Secret | Trạng thái |
|--------|-----------|
| `SUPABASE_URL` | ✅ `https://emkwknwcyyewevmmoxzj.supabase.co` |
| `SUPABASE_SERVICE_KEY` | ✅ JWT service_role (valid) |
| `DEMAND_TOKEN` | ✅ `mkt-demangen-2026` |
| `CLOUDFLARE_ACCOUNT_ID` | ✅ Đã set (cho browser_run) |
| `CLOUDFLARE_API_TOKEN` | ✅ Đã set (cho browser_run) |

### 📦 Cấu hình nguồn
| Mã | Transport | URL danh sách | Regex | Trạng thái |
|----|-----------|---------------|-------|------------|
| `vieclam24h` | `browser_run` | ✅ | `/.+id[0-9]+.html` | ✅ Hoạt động |
| `freelancerviet` | `truc_tiep` | ✅ | `freelancerviet\.vn/thong-tin-viec-freelance/` | ⚠️ JS-rendered |
| `vlance` | `browser_run` | ✅ | ❌ chưa config | Chưa test |
| `topcv` | `browser_run` | ✅ | `topcv.vn/viec-lam/` | ❌ Cloudflare chặn |
| `vietnamworks` | `browser_run` | ✅ | `vietnamworks.com/.*-job` | ❌ Next.js JSON |
| `fb_group` | `nap_tay` | ❌ | ❌ | ❌ Mặc định tắt |

### 🧪 Kết quả quét
| Metric | Giá trị |
|--------|---------|
| **Tổng items trong inbox** | 49+ |
| **Tổng leads đã chấm điểm** | 53+ |
| **Lần quét thành công** | 4+ |

### 📋 API Endpoints
| Endpoint | Method | Auth | Mô tả |
|----------|--------|------|-------|
| `/api/demand/trang-thai` | GET | ✅ Token | Xem nguồn đã config |
| `/api/demand/kiem-tra-transport` | GET | ✅ Token | Kiểm tra transport |
| `/api/demand/quet?nguon=X` | POST | ✅ Token | Quét 1 nguồn hoặc tất cả |
| `/api/demand/inbox` | GET | ✅ Token | Xem leads chưa merge |
| `/api/demand/nap` | POST | ✅ Token | Nạp lead thủ công |

### 🖥️ Giao diện
| Trang | URL | Auth | Mô tả |
|-------|-----|------|-------|
| Landing | `/` | ❌ | Marketing page |
| Dashboard | `/app` | GitHub OAuth | Duyệt lead, merge vào DB chính |
| Leads viewer | `/leads.html` | ❌ | Xem nhanh leads từ inbox |

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
8. `/api/demand/quet` không fetch config từ DB → fix
9. Queue jobs không được gửi → enable sendBatch
10. `napVaoInbox` bị comment → enable
11. Regex không khớp relative URLs → fix pattern
12. Thêm `/api/demand/inbox` endpoint
13. Thêm nút "Xem Inbox" trên dashboard
14. Thêm `/leads.html` viewer

## 📋 PENDING TASKS
| # | Task | Ưu tiên |
|---|------|---------|
| 1 | Bật cron tự động quét mỗi 30 phút | 🔴 HIGH |
| 2 | Fix freelancerviet — đổi sang `browser_run` | 🟡 MEDIUM |
| 3 | Tìm URL TopCV khác hoặc dùng crawl-agent | 🟡 MEDIUM |
| 4 | Config regex cho vlance | 🟢 LOW |
| 5 | Phase 3: Split worker.js thành modules nhỏ hơn | 🟢 LOW |

## 🔒 BẢO MẬT
- Supabase service_role key đã set trên Workers secret — **KHÔNG commit vào repo**
- GitHub OAuth Client ID/Secret đã cung cấp — cần xem xét rotate nếu bị lộ
- DEMAND_TOKEN `mkt-demangen-2026` — nên đổi nếu bị lộ

---
*Session completed successfully. Pipeline hoạt động端到端!*
