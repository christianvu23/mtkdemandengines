# Chiến lược kiểm thử

> 78 test, 0 phụ thuộc ngoài cho phần lõi. Chạy: `npm test`

---

## 1. Ba tầng kiểm thử

| Tầng | Chạy bằng | Cần gì | Bắt được lỗi gì |
|---|---|---|---|
| **Unit** | `npm test` | không gì | logic chấm điểm, bóc tách, dedup |
| **Tích hợp MCP** | `npm test` | không gì | giao thức MCP, hình dạng công cụ |
| **Smoke hệ thống** | `node scripts/smoke.mjs <url> <token>` | worker đã deploy | route, transport, ghi CSDL |

Unit và tích hợp chạy **offline hoàn toàn** — cố ý, để CI không phụ thuộc mạng
hay credential. Smoke chạy tay sau mỗi lần deploy.

---

## 2. Bộ test và thứ chúng bảo vệ

### `tests/chuanhoa.test.js` — 6 test
Nền của toàn bộ dedup. Test quan trọng nhất:

> **`chuanHoaText khớp hành vi hàm SQL dm_chuan_hoa_text`** — giá trị đối chiếu lấy
> trực tiếp từ Postgres. Nếu JS và SQL chuẩn hoá khác nhau, dedup hỏng **âm thầm**:
> cùng một bài đăng lại sẽ lọt qua vì hash khác nhau. Không có test này thì lỗi đó
> chỉ lộ ra sau vài tuần dữ liệu bẩn.

### `tests/trich-xuat.test.js` — 18 test
Bóc tách tiếng Việt: số điện thoại theo **đầu số thật** (loại `0201234567`), Zalo,
email, ngân sách (`5-10tr`, `500k`, `10 củ`, `5.000.000đ`, `$500`), khu vực theo tên
quận, hình thức hợp tác, độ tươi.

Hai test đáng chú ý:
- **USD không tự quy đổi** — tỷ giá thay đổi, bịa tỷ giá là tạo dữ liệu sai.
- **`conHan` mặc định KHÔNG loại lead khi thiếu dữ liệu hạn** — thà giữ nhầm còn hơn
  vứt nhầm.

### `tests/rubric-router.test.js` — 15 test
- **Bất biến tổng trọng số = 100** — chặn sửa nhầm một trục mà quên trục khác.
- **Ngân sách không bao giờ là điều kiện cắt** — chốt quyết định 09/08 vào code.
- **Luật bảo toàn** — tổng 4 nhóm định tuyến = tổng đầu vào, và có test chứng minh
  hàm kiểm *phát hiện được* khi cố tình làm mất lead.

### `tests/boc-link.test.js` — 14 test
Suy luận khuôn đường dẫn. Bộ này **đã bắt một lỗi thật**: giả định ban đầu là link
bài phải sâu hơn trang danh sách, sai với vLance (cùng độ sâu 2). 4 test đỏ → sửa
heuristic → xanh.

Kiểm cả trường hợp xấu: trang không đủ tín hiệu thì **báo `khong_du_tin_hieu`** chứ
không đoán bừa; regex sai cú pháp không làm sập.

### `tests/nap-lead.test.js` — 15 test
Điểm hội tụ. Đảm bảo lead nạp tay và lead cào về đi qua **đúng một** bộ luật, và
payload khớp đúng các khoá mà `merge_demand_inbox()` đọc.

### `tests/mcp.test.js` — 9 test
Chạy `mcp/server.js` như **tiến trình con thật**, nói chuyện bằng đúng giao thức MCP
qua stdio. Không mock.

Test giữ ranh giới kiến trúc:
> **`chỉ đúng một công cụ được phép ghi`** — nếu ai đó thêm công cụ đổi trạng thái
> lead, test này đỏ. Nguyên tắc "máy đề xuất, người bấm" được code bảo vệ chứ không
> chỉ nằm trong tài liệu.

Cố ý **không cấp credential Supabase** cho tiến trình con, để kiểm rằng công cụ cần
CSDL báo lỗi có hướng dẫn thay vì làm sập server.

---

## 3. Smoke test hệ thống

```bash
node scripts/smoke.mjs https://mtkdemandengines.<subdomain>.workers.dev <DEMAND_TOKEN>
```

Chạy tuần tự 6 bước, dừng ở bước đầu tiên hỏng:

1. Trang tĩnh phục vụ được
2. API từ chối request không có token *(nếu bước này pass tức là cổng nạp đang hở)*
3. `/api/demand/trang-thai` đọc được `demand_sources`
4. `/api/demand/kiem-tra-transport` — báo rõ transport nào sống
5. `/api/demand/nap` chấm và đẩy một lead mẫu, kiểm hạng trả về đúng như rubric offline
6. Lead mẫu xuất hiện trong hàng đợi

Script **tự dọn** lead mẫu khỏi hàng đợi ở bước cuối.

---

## 4. Evaluations cho MCP server

`mcp/evaluations.xml` — 10 câu hỏi, đáp án **đã chạy thật** qua server ngày 09/08/2026.

Điểm cần biết khi thêm câu mới: đáp án phải **bất biến theo thời gian**. Vì rubric
tính 25/100 điểm cho độ tươi, mọi câu hỏi về *điểm tổng* hay *hạng* sẽ sai sau vài
giờ. Toàn bộ 10 câu vì thế nhắm vào đầu ra bất biến: ngân sách, liên hệ, khu vực,
phân loại nhu cầu, hình thức, và các trục điểm không phụ thuộc thời gian.

Cũng vì lý do đó **không có câu hỏi nào dựa trên dữ liệu trong CSDL** — bảng đang
trống, và khi có dữ liệu thì nó đổi mỗi ngày.

---

## 5. Quy tắc khi thêm code

1. Logic mới đặt ở `src/core/` dạng **hàm thuần** — không I/O, để test được.
2. Mỗi luật nghiệp vụ mới phải có test **cho cả trường hợp xấu**, không chỉ đường
   hạnh phúc.
3. Ngưỡng và trọng số phải có test bất biến đi kèm.
4. `npm test` là **cổng chặn** trong CI — không sửa test cho xanh, sửa code.
