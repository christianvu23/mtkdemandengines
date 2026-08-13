=== ĐỀ XUẤT FIX (từ skills đã nạp) ===

A) ARCHIFY — Kiến trúc hiện tại:
- Frontend: public/app.html (anon key mới emkwknwcyyewevmmoxzj)
- User click "Nạp lead mới" → gọi RPC merge_demand_inbox() qua anon key
- Nếu RLS/schema/hàm RPC chưa có trên project mới → dữ liệu không nạp được

B) BAILIAN-CLI — Kiểm tra Supabase mới:
- Kiểm tra project emkwknwcyyewevmmoxzj có active không
- Kiểm tra bảng demand_leads, hàm merge_demand_inbox(), app_users

C) CUSTOMIZE-OPENCODE — Cấu hình lại:
- Cập nhật .opencode/config hoặc secrets cho project mới
- Đảm bảo SUPABASE_URL và SERVICE_KEY trỏ đúng

HÀNH ĐỘNG NGAY:
1. Kiểm tra migrations đã áp lên project mới chưa
2. Kiểm tra RLS policies cho demand_leads
3. Kiểm tra hàm merge_demand_inbox() tồn tại
4. Nếu chưa có → chạy lại migrations từ db/migrations/
