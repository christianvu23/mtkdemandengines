# Hướng dẫn deploy Demand Engine

> Cập nhật 09/08/2026. Mọi lệnh dưới đây tôi đã kiểm chứng ở mức có thể kiểm chứng được
> từ sandbox: `wrangler.toml` đã chạy `wrangler deploy --dry-run` **thành công** (wrangler
> 4.120.0, đọc đúng 1 file từ `public/`), 39 test pass, cú pháp workflow lấy từ tài liệu
> chính thức của Cloudflare. Thứ tôi **không** kiểm chứng được: bước deploy thật, vì phiên
> làm việc không có credential Cloudflare.

---

## Chọn 1 trong 3 cách

| Cách | Khi nào dùng | Cần gì |
|---|---|---|
| **A. wrangler CLI** | Muốn có link ngay trong 2 phút | Node 20+, trình duyệt để đăng nhập |
| **B. GitHub Actions** | Muốn mỗi lần push là tự deploy | 2 secret trong repo |
| **C. Dashboard** | Không muốn dùng terminal | Chỉ cần trình duyệt |

---

## A. Deploy bằng wrangler CLI — nhanh nhất

```bash
cd <thư mục repo mtkdemandengines>

# 1. Đăng nhập (mở trình duyệt, chọn tài khoản Cloudflare)
npx wrangler login

# 2. Deploy — wrangler tự đọc wrangler.toml
npx wrangler deploy
```

Kết thúc, wrangler in ra URL dạng `https://mtkdemandengines.<subdomain>.workers.dev`.

Nếu muốn xem trước tại máy trước khi đẩy lên:

```bash
npx wrangler dev
```

---

## B. GitHub Actions — push là tự deploy

Repo đã có sẵn `.github/workflows/deploy-cloudflare.yml`. Nó chạy `npm test` làm **cổng
chặn** rồi mới deploy — nếu logic chấm điểm hoặc chống trùng bị hỏng thì deploy bị dừng.

### B1. Tạo API token

Cloudflare dashboard → **My Profile** → **API Tokens** → **Create Token**
→ dùng mẫu **Edit Cloudflare Workers** → Create.

Copy token ngay (chỉ hiện một lần).

### B2. Lấy Account ID

Cloudflare dashboard → **Workers & Pages** → Account ID hiện ở cột phải.

### B3. Nạp secret vào repo

GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Tên secret | Giá trị |
|---|---|
| `CLOUDFLARE_API_TOKEN` | token ở bước B1 |
| `CLOUDFLARE_ACCOUNT_ID` | account id ở bước B2 |

> ⚠️ Không commit token vào repo. Token này cho phép deploy Worker lên tài khoản của bạn.

### B4. Push

```bash
git push origin main
```

Xem tiến trình ở tab **Actions** của repo. Deploy xong, URL nằm trong log bước
"Deploy len Cloudflare".

---

## C. Deploy bằng dashboard (không cần terminal)

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Upload assets**
2. Đặt tên `mtkdemandengines`
3. Kéo thả **nội dung bên trong thư mục `public/`** (tức file `index.html`), không kéo cả thư mục
4. Deploy

Cách này chỉ deploy phần giao diện. Khi thêm Worker backend sau này thì phải chuyển sang A hoặc B.

---

## Sau khi deploy — kiểm tra 4 điểm

1. **Trang mở được**, hiện badge `DEMO` và 8 lead mẫu.
2. **Đổi sáng/tối** bằng nút `◐` — màu hạng A-D vẫn phân biệt được ở cả hai chế độ.
3. **Bấm "Kết nối dữ liệu thật"** → chuyển sang đăng nhập GitHub.
   - Nếu báo *"Không tải được thư viện Supabase từ CDN"* → mạng chặn `cdn.jsdelivr.net`.
   - Nếu đăng nhập xong mà báo *"bảng demand_leads đang trống"* → **đúng như dự kiến**,
     vì chưa có scraper nào chạy. Không phải lỗi.
4. **Bấm một lead** → panel chi tiết hiện phân rã điểm 100.

---

## Cấu hình OAuth cho Supabase (bắt buộc cho chế độ Live)

Sau khi có URL thật, phải khai báo nó với Supabase, nếu không đăng nhập GitHub sẽ
quay về sai chỗ:

Supabase dashboard → project `dlzhcfrojibpscozdmrx` (mtkdemandengines) → **Authentication** → **URL Configuration**
→ thêm URL Worker vào **Redirect URLs**.

---

## Những gì đã sẵn sàng và những gì chưa

| Thành phần | Trạng thái |
|---|---|
| Schema + RLS + trigger + `merge_demand_inbox()` | ✅ Đã áp thật lên Supabase, đã kiểm chứng 5 nhánh lọc |
| Logic thuần `src/core/` | ✅ 39 test pass |
| UI duyệt lead | ✅ Chạy được, đã soi ảnh render ở cả 2 chế độ màu |
| `wrangler.toml` | ✅ Đã qua `wrangler deploy --dry-run` |
| Workflow GitHub Actions | ✅ Cú pháp theo docs Cloudflare — **chưa chạy thật lần nào** |
| Scraper từng nguồn | ❌ Chưa có → nên `demand_leads` còn trống |
| Worker backend `/api/demand/*` | ❌ Chưa có |
| Cron tự quét | ❌ Chưa có (đã để sẵn chỗ trong `wrangler.toml`) |
| Learner | ❌ Chưa có — cần ≥2 tuần dữ liệu thật trước |

---

## Nếu deploy lỗi

| Triệu chứng | Nguyên nhân thường gặp |
|---|---|
| `Authentication error [code: 10000]` | Token sai quyền — phải là **Edit Cloudflare Workers** |
| `workers.dev subdomain not configured` | Vào Workers & Pages bật subdomain workers.dev một lần |
| Actions fail ở bước `npm test` | Logic bị hỏng — **đừng bỏ qua bước này**, đọc log test |
| Trang trắng | Mở DevTools Console; file là self-contained nên lỗi thường do CDN Supabase bị chặn |
