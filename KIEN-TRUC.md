# Kiến trúc kỹ thuật — Demand Engine

> Cập nhật 09/08/2026 · Tài liệu dành cho người viết code, không phải cho người dùng cuối.
> Phần giao diện cố ý để tối giản — Christian tự làm UX/UI.

---

## 1. Sơ đồ tổng

```
         ┌──────────────── NGUỒN ────────────────┐
         │ vLance · FreelancerViet · job board   │
         │ Facebook (chỉ qua người) · …          │
         └───────────────────┬───────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ TẦNG 1 — TRANSPORT   src/transport/index.js                  │
│  truc_tiep · browser_run · unlocker · nap_tay                │
│  Cùng một giao diện trả về, có đường lùi rẻ→đắt              │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ TẦNG 2 — TÁCH LINK   src/core/boc-link.js                    │
│  Suy luận theo KHUÔN đường dẫn, không cần regex per-site     │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ TẦNG 3 — HIỂU & CHẤM ĐIỂM   src/core/*.js  (hàm thuần)       │
│  chuanhoa · nhucau · lienhe · ngansach · tuoi                │
│  → rubric-lead (100đ) → router-lead (4 nhóm + luật bảo toàn) │
│  Điểm hội tụ: nap-lead.js                                    │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
        demand_inbox  ──►  merge_demand_inbox()  ──►  demand_leads
                            ▲
                    NGƯỜI BẤM, không phải máy
```

---

## 2. Ba quyết định kiến trúc và lý do

### 2.1. Tách transport khỏi adapter

**Vấn đề đo được 09/08/2026:** vLance trả **403** với client không phải trình duyệt
(robots.txt *không* cấm trang việc — đây là chặn kỹ thuật, không phải chặn pháp lý).
FreelancerViet trả 200 nhưng listing không nằm trong HTML thô.

**Nếu viết `fetch()` thẳng trong adapter** thì mỗi nguồn khó là một lần viết lại.
Tách ra thì "bị 403" chỉ là đổi `demand_sources.transport` từ `truc_tiep` sang
`browser_run`. Không đụng một dòng logic nào.

Đường lùi cố ý theo thứ tự **rẻ → đắt**, và **không bao giờ tự lùi sang `nap_tay`**
vì transport đó cần con người.

### 2.2. Dùng markdown thay vì CSS selector

Skill `scraper-builder` yêu cầu: *chạy thật trên mẫu nhỏ rồi xem dữ liệu trước khi
coi là xong*. Phiên xây dựng **không có credential** để xem HTML thật của vLance,
nên viết CSS selector là bịa.

Cả `browser_run` (`/markdown`) lẫn `unlocker` (`data_format: markdown`) đều trả
markdown. Bộ luật tiếng Việt trong `src/core` đọc markdown tốt như đọc text, và
**không vỡ khi site đổi class**.

### 2.3. Suy luận khuôn đường dẫn thay vì regex khai trước

Bản đầu bắt mỗi nguồn khai `regex_link_bai` — mà không xem được HTML thì không khai
được, Hunter đứng im.

`boc-link.js` suy ra link bài bằng thống kê: gom link theo **khuôn đường dẫn**
(`/du-an/thiet-ke-logo-12345` → `/du-an/:slug`), lấy nhóm đông nhất. Link điều hướng
mỗi cái một khuôn, link bài thì hàng chục cái cùng khuôn.

Ba luật lọc trước khi gom:

| Luật | Bắt được gì |
|---|---|
| Cùng host với trang danh sách | loại link ra site khác |
| **Khác khuôn với chính trang danh sách** | loại phân trang và biến thể bộ lọc |
| Đoạn cuối trông như định danh riêng | loại `/gioi-thieu`, `/dang-nhap` |

> Luật giữa là chỗ tôi làm sai lần đầu: tôi giả định link bài phải **sâu hơn** trang
> danh sách. Sai — vLance có danh sách `/viec-lam-freelance/cpath_…` và bài `/du-an/…`
> cùng độ sâu 2. Test bắt được, đã sửa.

Nguồn nào đã biết khuôn thật thì điền `cau_hinh.regex_link_bai`, nó **được ưu tiên**
hơn suy luận.

---

## 3. Rubric 100 điểm — vì sao trọng số như vậy

Christian nhận làm **toàn bộ** mảng marketing → "độ khớp dịch vụ" gần như luôn đúng,
tức là **biến phân biệt yếu**. Trọng số dồn sang trục thật sự phân biệt:

| Trục | Điểm | Bất biến theo thời gian? |
|---|---|---|
| Độ tươi | 25 | ❌ giảm dần theo giờ |
| Khả năng liên hệ | 20 | ✅ |
| Độ cụ thể | 20 | ✅ |
| Độ khớp dịch vụ | 15 | ✅ |
| Tín hiệu ngân sách | 12 | ✅ |
| Hình thức hợp tác | 8 | ✅ |
| Phạt cạnh tranh | −10 tối đa | ✅ |

Hạng: **A ≥75 · B 60–74 · C 45–59 · D <45**

**Triệt tiêu về 0** (không phải trừ điểm): lead **hết hạn**, hoặc nhu cầu **ngoài
phạm vi dịch vụ**.

Ngân sách **chỉ chấm điểm, không bao giờ cắt** — theo quyết định "lấy hết, không lọc
theo tiền" ngày 09/08. Có test chặn riêng cho luật này.

> ⚠️ Toàn bộ ngưỡng là **giả thuyết chưa hiệu chỉnh trên dữ liệu thật**. Sau 2–3 tuần
> chạy phải đọc `demand_query_log` rồi chỉnh lại.

---

## 4. Ranh giới không được vượt

Bốn ràng buộc dưới đây được **test chặn**, không phải chỉ ghi trong tài liệu:

1. **Máy đề xuất, người bấm.** Worker và MCP server chỉ ghi vào `demand_inbox`.
   Không thành phần tự động nào gọi `merge_demand_inbox()` hay đổi trạng thái lead.
   MCP server *cố ý* không có công cụ đổi trạng thái — có test kiểm điều này.
2. **Cột người dùng chỉ người sửa.** Trigger `dm_bao_ve_cot_nguoi_dung` chặn tiến
   trình máy ghi đè `status`/`my_notes`/`gia_chao`. Đã thử tấn công thật và bị chặn.
3. **Luật bảo toàn.** Tổng 4 nhóm định tuyến luôn bằng tổng đầu vào.
4. **Trần chi phí ở tầng dữ liệu.** `demand_sources.tran_lead_moi_dot` giới hạn số
   lead mỗi đợt — ở tầng code, không phải ở tầng kỷ luật.

---

## 5. Bản đồ file

| File | Vai trò | Test |
|---|---|---|
| `src/core/chuanhoa.js` | Bỏ dấu, chuẩn hoá text/URL, khoá dedup, Jaccard | `chuanhoa.test.js` |
| `src/core/nhucau.js` | 9 nhóm nhu cầu, ngoài phạm vi, hình thức, khu vực | `trich-xuat.test.js` |
| `src/core/lienhe.js` | SĐT theo đầu số VN thật, Zalo, email, link | `trich-xuat.test.js` |
| `src/core/ngansach.js` | 5-10tr · 500k · 10 củ · 5.000.000đ · $500 | `trich-xuat.test.js` |
| `src/core/tuoi.js` | Tuổi lead, TTL, điểm độ tươi | `trich-xuat.test.js` |
| `src/core/rubric-lead.js` | Chấm 100 điểm, xếp hạng | `rubric-router.test.js` |
| `src/core/router-lead.js` | 4 nhóm + luật bảo toàn | `rubric-router.test.js` |
| `src/core/boc-link.js` | Suy luận khuôn, tách link bài | `boc-link.test.js` |
| `src/core/nap-lead.js` | Điểm hội tụ: thô → lead đã chấm | `nap-lead.test.js` |
| `src/transport/index.js` | 4 transport + đường lùi | `nap-lead.test.js` |
| `worker.js` | Route API + cron | `scripts/smoke.mjs` |
| `mcp/server.js` | MCP server, 6 công cụ | `mcp.test.js` |

`chuanHoaText()` bên JS **khớp từng ký tự** với hàm SQL `dm_chuan_hoa_text()` —
có test đối chiếu. Nếu hai bên lệch nhau thì dedup hỏng âm thầm.

---

## 6. Việc còn thiếu

| Việc | Vì sao chưa làm |
|---|---|
| Chạy thật trên HTML vLance/FreelancerViet | Sandbox không có credential — **việc số 1** |
| Learner (phân tích năng suất query) | Cần ≥2 tuần dữ liệu thật mới có nghĩa |
| Hàng đợi enrichment | Router đã phân nhóm `enrich` nhưng chưa có nơi xử lý |
| Bật cron | Chỉ bật sau khi `/api/demand/kiem-tra-transport` xanh |
