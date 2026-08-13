---
description: Chạy luồng tự động deploy cho Demand Engine — áp migrations, kiểm tra transport và xác nhận trạng thái live site
agent: deploy
---

Bạn là agent deploy cho **Demand Engine** (project `mtkdemandengines`). Khi người dùng gọi `/deploy`, hãy thực hiện luồng tự động sau theo đúng thứ tự:

## Luồng tự động (pipeline):

### 1. Kiểm tra cấu hình hiện tại
- Đọc `.opencode/opencode.json` và `wrangler.toml`
- Xác nhận `SUPABASE_URL` đã trỏ `https://emkwknwcyyewevmmoxzj.supabase.co` (project mới từ 11/08/2026)
- Nếu chưa đúng → báo lỗi và dừng

### 2. Áp migrations database (theo thứ tự bắt buộc)
Sử dụng reference `@migrations`:
- Đọc `@migrations/20260809_00_nen_tang_phan_quyen.sql` → áp lên Supabase mới
- Đọc `@migrations/20260809_demand_engine_v1.sql` → áp lên Supabase mới
- Đọc `@migrations/20260811_demand_sources_transport.sql` → áp lên Supabase mới
- Nếu bất kỳ bước nào lỗi → dừng và báo chi tiết

### 3. Kiểm tra hàm RPC `merge_demand_inbox()`
- Sau khi áp migrations, kiểm tra hàm `merge_demand_inbox()` đã tồn tại trên bảng `demand_leads`
- Nếu chưa có → tạo lại từ nội dung trong `db/migrations/20260809_demand_engine_v1.sql`

### 4. Kiểm tra transport
- Chạy `node src/services/supabase.js` hoặc kiểm tra `wrangler.toml` secrets
- Xác nhận `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` đã cấu hình (nếu dùng browser_run)
- Nếu thiếu → báo người dùng cần thêm bằng `npx wrangler secret put <TEN>`

### 5. Cập nhật frontend config
- Đọc `public/app.html` và xác nhận `CAU_HINH.supabaseUrl` và `CAU_HINH.supabaseKey` đã đúng với project mới
- Nếu sai → sửa và commit

### 6. Test kết nối live site
- Kiểm tra URL: `https://mtkdemandengines.christianvu23.workers.dev/`
- Báo trạng thái: kết nối thành công hay thất bại

### 7. Báo cáo kết quả
Trả về tóm tắt theo định dạng:
```
=== KẾT QUẢ DEPLOY ===
Project mới: emkwknwcyyewevmmoxzj ✅
Migrations áp: 3/3 ✅
Hàm merge_demand_inbox(): TỒN TẠI ✅
Live site: https://mtkdemandengines.christianvu23.workers.dev/ ✅
Wrangler secrets: KIỂM TRA CẦN THÊM (nếu thiếu) ⚠️
```

Nếu có lỗi ở bất kỳ bước nào, dừng ngay và báo chi tiết lỗi để người dùng xử lý.
