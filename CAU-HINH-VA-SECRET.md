# Cấu hình & secret — Demand Engine

> Cập nhật 11/08/2026. File này ghi lại CẤU TRÚC cấu hình và nơi lấy giá trị.
> **KHÔNG commit giá trị secret thật vào repo.** Mọi giá trị nhạy cảm nạp qua
> `npx wrangler secret put <TÊN>` — đã có trong `.gitignore` và chỉ nằm trên Cloudflare.

---

## 1. Project Supabase (ĐÃ ĐỔI — 11/08/2026)

⚠️ Project mới, KHÁC với project cũ ghi trong `HUONG-DAN-DEPLOY.md`:

| Mục | Giá trị |
|---|---|
| **Project URL** | `https://emkwknwcyyewevmmoxzj.supabase.co` |
| Project ref | `emkwknwcyyewevmmoxzj` |
| Project cũ (hết dùng) | `dlzhcfrojibpscozdmrx` — key mới bị 401 |

> Lưu ý khi đối chiếu: JWT của key phải có `"ref":"emkwknwcyyewevmmoxzj"` mới khớp
> project này. Key nào `ref` khác → thuộc project khác, trả 401.

Trạng thái bảng (đã kiểm chứng bằng service_role JWT, 11/08):

| Bảng | Trạng thái |
|---|---|
| `demand_leads` | ✅ Có — **0 dòng** (chưa có scraper nào chạy) |
| `demand_inbox` | ✅ Có |
| `demand_sources` | ✅ Có — 5 nguồn đã seed |
| `app_users` | ✅ Có |

---

## 2. Secret đã nạp lên Cloudflare Worker `mtkdemandengines`

| Tên secret | Giá trị đã nạp | Nơi lấy khi cần đổi |
|---|---|---|
| `SUPABASE_URL` | ✅ `https://emkwknwcyyewevmmoxzj.supabase.co` | trong bảng trên |
| `SUPABASE_SERVICE_KEY` | ✅ JWT service_role của project mới | Supabase → Settings → API → service_role |
| `DEMAND_TOKEN` | ✅ `mkt-demangen-2026` | tự đặt |
| `CLOUDFLARE_ACCOUNT_ID` | ❌ chưa nạp (chưa dùng) | Cloudflare dashboard |
| `CLOUDFLARE_API_TOKEN` | ❌ chưa nạp (chưa dùng) | Cloudflare → My Profile → API Tokens |
| `BRIGHTDATA_API_KEY` | ❌ chưa nạp (chưa dùng) | Bright Data |
| `BRIGHTDATA_UNLOCKER_ZONE` | ❌ chưa nạp (chưa dùng) | Bright Data |

> `sb_secret_...` mà tài khoản cấp **trả 401** với cả 2 project — không dùng được,
> nên dùng JWT service_role (đã xác minh 200). Nếu muốn dùng key mới, xác nhận
> đúng project và thử lại.

---

## 3. 🔒 CẢNH BÁO BẢO MẬT — nên đổi key ngay

Các key sau đã được **gửi qua chat** nên không còn là bí mật an toàn:

- `SUPABASE_SERVICE_KEY` (JWT service_role) — đã nạp lên worker, **nhưng nên xoay
  (rotate) sau khi công việc ổn định**, vì nếu không ai đọc lại chat, vẫn có rủi ro.
- `SUPABASE_ANON_KEY` — client-side, không nhạy lắm nhưng cũng nên xoay cho gọn.
- `DEMAND_TOKEN` (`mkt-demangen-2026`) — khoá cổng nạp; nếu bị lộ, người khác
  đẩy được lead giả vào inbox. Nên đổi sau khi thử xong.

Quy tắc từ giờ:
1. **Không gửi key qua chat.** Nạp trực tiếp bằng `npx wrangler secret put`.
2. Key mới phải đối chiếu `ref` JWT với `SUPABASE_URL` trước khi dùng.
3. Không commit giá trị secret vào repo (file này chỉ giữ placeholder).

---

## 4. Cách nạp lại một secret

```bash
# Ví dụ: đổi DEMAND_TOKEN
npx wrangler secret put DEMAND_TOKEN
# → dán giá trị rồi Enter

# Xem secret đã nạp (chỉ tên, không giá trị)
npx wrangler secret list
```

Sau khi đổi secret **phải redeploy** để có hiệu lực:

```bash
npx wrangler deploy
```

---

## 5. Cách kiểm tra hệ thống sau khi nạp secret

```bash
# Smoke test toàn hệ thống (trang tĩnh, bảo vệ API, nguồn, transport, nạp lead mẫu)
node scripts/smoke.mjs https://mtkdemandengines.christianvu23.workers.dev mkt-demangen-2026

# Cào FreelancerViet tự động bằng Playwright (chạy trên máy mình)
set DEMAND_TOKEN=mkt-demangen-2026
node scripts/cao-tu-dong.mjs --nguon freelancerviet
```

Kết quả recon 11/08/2026:

| Nguồn | Kết quả |
|---|---|
| FreelancerViet | ✅ Cào được 5 bài việc thật (khuôn `/thong-tin-viec-freelance/`) |
| vLance | ❌ Chặn bằng Cloudflare "Just a moment..." — cả Chrome thật cũng không qua; dùng nạp tay |
