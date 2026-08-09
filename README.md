# mtkdemandengines — Demand Engine

Hệ thống quét và chấm điểm **nhu cầu Marketing / branding / social tại Việt Nam**
(doanh nghiệp, shop, agency, cá nhân đang cần thuê người làm content, quay dựng,
thiết kế, branding, ads, PR, sự kiện, cộng đồng).

Đây là **Phương án B** trong `PHAN-TICH-DEMAND-ENGINE-MKT.md` — tái dùng kiến trúc đã
chứng minh của CMCTS Global (Scout/Assessor/Router/Learner) nhưng thay ruột cho bài toán
tìm **nhu cầu** thay vì tìm **ứng viên**.

---

## Khác biệt cốt lõi so với dự án tìm ứng viên

| | Tìm ứng viên (CMCTS) | Tìm nhu cầu (repo này) |
|---|---|---|
| Đối tượng | Hồ sơ LinkedIn — **tĩnh**, tồn tại nhiều năm | Bài đăng — **có hạn dùng ~24–72h** |
| Giá trị cạnh tranh | Độ phủ + độ chính xác | **Tốc độ chạm** |
| Trùng lặp | Dedup theo slug — dễ | Dedup theo **nội dung** (1 người đăng 5 nhóm) |
| Sai lầm tốn gì | Xem nhầm hồ sơ = mất 30 giây | Chạm nhầm = **mất uy tín** |

Hệ quả: trục thời gian (`posted_at` / `expires_at` / TTL theo nguồn) là thành phần
**hoàn toàn mới**, không có trong CMCTS. Đó là phần đắt nhất, không phải phần tìm kiếm.

---

## Trạng thái (09/08/2026)

| Tầng | Trạng thái |
|---|---|
| Nền tảng phân quyền (`app_users`, `vai_tro`, `co_quyen_*`) | ✅ **Đã áp thật** lên project riêng `dlzhcfrojibpscozdmrx` |
| Schema + RLS + trigger + `merge_demand_inbox()` | ✅ **Đã áp thật**, đã kiểm chứng 5 nhánh lọc bằng dữ liệu mẫu |
| Logic thuần `src/core/` | ✅ 6 module, **39 test pass** |
| Scraper từng nguồn `src/sources/` | ❌ chưa làm |
| Worker + cron | ❌ chưa làm |
| UI duyệt lead `public/index.html` | ✅ chạy được, đã soi ảnh render 2 chế độ màu |
| Learner | ❌ chưa làm (cần ≥2 tuần dữ liệu thật trước) |

---

## Cấu trúc

```
src/core/                 Logic thuần — không I/O, unit-test được
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
tests/                    39 test (node:test, không cần cài gì thêm)
```

## Chạy test

```bash
npm test        # 39 test, không cần dependency ngoài
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

Triệt tiêu về 0 (không phải trừ điểm): lead **hết hạn**, hoặc nhu cầu **ngoài phạm vi**.

> ⚠️ Các ngưỡng này là **giả thuyết ban đầu, chưa hiệu chỉnh trên dữ liệu thật**.
> Sau 2–3 tuần chạy, Learner phải đọc `demand_query_log` + kết quả thật để đề xuất chỉnh.

---

## Nguyên tắc bất di bất dịch (kế thừa từ CMCTS)

1. **Máy đề xuất, người bấm.** Router không tự liên hệ ai.
2. **Cột người dùng chỉ người sửa.** Trigger `dm_bao_ve_cot_nguoi_dung` chặn tiến trình
   máy ghi đè `status` / `my_notes` / `gia_chao`… — đã kiểm chứng thật.
3. **Luật bảo toàn.** Tổng 4 nhóm định tuyến luôn bằng tổng đầu vào; có test chặn.
4. **Không bịa dữ liệu.** Chỉ ghi nội dung thực sự xuất hiện ở nguồn, kèm `evidence`.
5. **Trần chi phí ở tầng code**, không phải ở tầng kỷ luật.

---

## ⚠️ Rủi ro pháp lý — đọc trước khi bật nguồn Facebook

Nguồn `fb_group` được seed với `dang_bat = false` **có chủ ý**. Scrape Facebook Group
vi phạm Điều khoản dịch vụ của Meta và có rủi ro khoá tài khoản. Ngoài ra Việt Nam có
Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.

Tôi không phải luật sư và **không đưa ra tư vấn pháp lý** ở đây — chỉ nêu vấn đề cần
xem xét. Hãy tự đánh giá (hoặc hỏi luật sư) trước khi đặt `dang_bat = true`.

---

## Việc tiếp theo

1. `src/sources/vlance.js` + `freelancerviet.js` — scraper 2 nguồn dễ và ít rủi ro nhất
2. Worker + route `/api/demand/*` + cron 30 phút cho nguồn nóng
3. UI duyệt lead (nút "Nạp lead mới" gọi `merge_demand_inbox()`)
4. Learner — **chỉ sau khi có ≥2 tuần dữ liệu thật**
