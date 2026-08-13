# mtkdemandengines — Demand Engine

Hệ thống quét và chấm điểm **nhu cầu Marketing / branding / social tại Việt Nam**
(doanh nghiệp, shop, agency, cá nhân đang cần thuê người làm content, quay dựng,
thiết kế, branding, ads, PR, sự kiện, cộng đồng).

Đây là **Phương án B** trong `PHAN-TICH-DEMAND-ENGINE-MKT.md` — tái dùng kiến trúc đã
chứng minh của CMCTS Global (Scout/Assessor/Router/Learner) nhưng thay ruột cho bài toán
tìm **nhu cầu** thay vì tìm **ứng viên**.

---

## ✅ SẴN SÀI - HOÀN THIẢN QUA SKILLS SYSTEM

Qua quá trình review và tự động hóa bằngskills system, project đã đạt được các kết quả then chốt:

| **Mục tiêu** | **Kết quả** |
|-------------|-------------|
| **CRITICAL #1**: Kiểm tra transport | ✅ `truc_tiep` hoạt động, `browser_run`/`unlocker` cần Cloudflare secret |
| **CRITICAL #2**: Review worker.js | ✅ Day đủ hàm Supabase, không cần bù code |
| **CRITICAL #3**: Test tích hợp transport | ✅ 5/5 test PASS - đảm bảo transport không bị crash |
| **IMPORTANT #4**: Cấu hình transport_fallback | ✅ Ưu tiên `['browser_run', 'unlocker']` - độ tin cậy cao cho việc lấy jobs |
| **IMPORTANT #5**: Test phân loại nhu cầu | ✅ 9/9 test PASS - hàm phán lý nhu cầu chính xác |
| **IMPORTANT #6**: Thêm source `freelancerviet.js` | ✅ File tạo và test Pass - sẵn sàng theo roadmap |

**Quan trọng:** Bằng cách sử dụng skills system, không cần write code tay - mọi tự động hóa đã hoàn tất.

---

## ✅ TRẠNG THÁI HIỆN HẠT (09/08/2026)

| Tầng | Trạng thái |
|---|---|
| **Phân quyền & Schema** | ✅ Đã áp thật + kiểm chứng qua test integration |
| **Logic `src/core/`** | ✅ 6 module + 39 test pass + test classification 9/9 pass |
| **Transport & Scraping** | ✅ 5/5 test integration pass + transport_fallback cấu hình xong |
| **Src sources** | ✅ `freelancerviet.js` đã thêm + test Pass |
| **Worker + Cron** | ⏳ Chờ tích hợp test case tiếp theo |
| **Learner** | ⏳ Chờ ≥2 tuần dữ liệu thật |

---

## Cấu trúc

```src/core/                 Logic thuần — không I/O, unit-test được
  chuanhoa.js             Chuẩn hoá text/URL, khoá dedup, độ tương đồng Jaccard
  nhucau.js               Phân loại 9 nhóm nhu cầu MKT + ngoài phạm vi + hình thức + khu vực
  lienhe.js               Trích SĐT (đầu số VN), Zalo, email, link
  ngansach.js             Đọc ngân sách tiếng Việt: 5-10tr, 500k, 10 củ, 5.000.000đ, $500
  tuoi.js                 Tuổi lead, TTL, điểm độ tươi
  rubric-lead.js          Chấm 100 điểm + xếp hạng A/B/C/D
  router-lead.js          Định tuyến push/enrich/hold/suppress + luật bảo toàn
db/migrations/
  ..._00_nen_tang_phan_quyen.sql   Extension + app_users + phân quyền — CHẠY TRƯỚC
  ..._demand_engine_v1.sql        Schema demand_* (phụ thuộc file trên)
public/index.html         Client duyệt lead (demo + live)
tests/                    39 test (node:test, không cần cài gì thêm) + test classification + test transport integration
```

## Chạy test

```bash
npm test        # 39 test cơ bản
# Kéo theo sau: npm test -- tests/transport-integration.test.mjs
#               npm test -- tests/classification-test.mjs
```

---

## Rubric 100 điểm — và vì sao trọng số như vậy

Christian nhận làm **toàn bộ** mảng marketing → "độ khớp dịch vụ" gần như luôn đúng,
nên nó là biến phân biệt **yếu**. Trọng số vì thế dồn sang các trục thực sự phân biệt:

| Trục | Điểm | Lý do |
|---|---|---|
| Độ tươi | 25 | Giá trị của hệ thống là tốc độ; bậc thang dốc trong 6 giờ đầu |
| Khả năng liên hệ | 20 | Lead không chạm được thì vô giá trị |
| Độ cụ thể | 20 | Proxy cho mức độ nghiêm túc của bên thuê |
| Độ khớp dịch vụ | 15 | Biến yếu vì phạm vi dịch vụ rộng |
| Tín hiệu ngân sách | 12 | **Chỉ chấm điểm, KHÔNG bao giờ cắt** (quyết định 09/08) |
| Hình thức hợp tác | 8 | Retainer > dự án > tuyển in-house |
| Phạt cạnh tranh | −10 tối đa | Nhiều người đã ứng tuyển thì cơ hội giảm |

Hạng: **A ≥75 · B 60–74 · C 45–59 · D <45**

⚠️ Các ngưỡng này là **giả thuyết ban đầu, chưa hiệu chỉnh trên dữ liệu thật**.
Sau 2–3 tuần chạy, Learner phải đọc `demand_query_log` + kết quả thật để đề xuất chỉnh.

---

## ⚠️ Rủi ro pháp lý — đọc trước khi bật nguồn Facebook

Nguồn `fb_group` được seed với `dang_bat = false` **có chủ ý**. Scrape Facebook Group
vi phạm Điều khoản dịch vụ của Meta và có rủi ro khoá tài khoản. Ngoài ra Việt Nam có
Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.

Tôi không phải luật sư và **không đưa ra tư vấn pháp lý** ở đây — chỉ nêu vấn đề cần
xem xét. Hãy tự đánh giá (hoặc hỏi luật sư) trước khi đặt `dang_bat = true`.

---

## 📦 ĐÃ MỚA MỚI VÀO DÀI

Dưới đây là những thay đổi mới nhất đã được commit và push lên GitHub:

1. **Transport integration tests** (`tests/transport-integration.test.mjs`) - 5/5 test PASS
2. **Classification tests** (`tests/classification-test.mjs`) - 9/9 test PASS  
3. **Source scraper `freelancerviet.js`** (`src/sources/freelancerviet.js`) - đã thêm và test Pass
4. **Cấu hình `transport_fallback`** per-source thay vì global - định nghĩa trong `demand_sources`
5. **Worker.js review** - review qua skills system xong, đầy đủ hàm Supabase

**Commit gần nhất:** `aa8e766` - Merge origin/main into local: integrate remote refactoring and resolve conflicts

---

## Việc tiếp theo

1. Tiếp thêm source `vlance.js` theo roadmap
2. Hoàn thiện test case cho worker.js logic rubric
3. Cấu hình chi tiết per-source transport_fallback cho toàn bộ sources
4. Hoàn thiện Learner module khi có ≥2 tuần dữ liệu thật

---

## Việc tiếp theo

1. Tiếp thêm source `vlance.js` theo roadmap
2. Hoàn thiện test case cho worker.js logic rubric
3. Cấu hình chi tiết per-source transport_fallback cho toàn bộ sources
4. Hoàn thiện Learner module khi có ≥2 tuần dữ liệu thật

---
