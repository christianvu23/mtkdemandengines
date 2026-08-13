# Session State - mtkdemandengines Project

**Opened:** New session after completing critical/important tasks via skills system

## 📊 STATUS 3 LỰA CHỌN ĐANG HOẠT ĐỘNG

### **Lựa chọn 1: Fix live site issue**
- **Trạng thái:** ⏳ Chờ manual check browser
- **Vấn đề:** `curl` gặp SSL/shannel error trên local (CRYPT_E_REVOCATION_OFFLINE)
- **Cần làm:** Mở browser vào `https://mtkdemandengines.christianvu23.workers.dev/app`, F12 -> Console/Network, báo lỗi ra
- **Status skill agent:** Symlink created tại `.pi/skills/live-site-investigation` nhưng cần tạo nội dung skill thực tế

### **Lựa chọn 2: Tạo skill agent đầy đủ**
- **Trạng thái:** ⏳ Đang tạo file skill `.md`
- **Nội dung cần tạo:**
  - Name: `live-site-investigation`
  - Description: Agent cho việc check live site và chạy diagnose
  - Quick start: Cách check Console/Network errors
  - Workflow: Bước 1: curl/check browser, Bước 2: analyze errors, Bước 3: fix hoặc report
  - Anti-patterns: Đàoán lỗi giả định, bỏ qua robots.txt, forget cấu hình transport
- **Kết quả mong muốn:** File skill `.md` đầy đủ để user có thể.invoke

### **Lựa chọn 3: Tiếp tục project mtkdemandengines**
- **Trạng thái:** ⏳ Chưa tiếp tục
- **Mục đang pending (từ roadmap):**
  1. Add `vlance.js` source scraper theo roadmap (chỉ `freelancerviet.js` đã có)
  2. Fine-tune `transport_fallback` cho toàn bộ sources (đã configs cho alcuni sources)
  3. Mở rộng test coverage cho rubric scoring và lead routing logic
  4. Update documentation phản ánh cấu hình mới

## 🧠 KEY DECISIONS - RECENT

| **Quyết định** | **Ngày** | **Kết quả** |
|--------------|----------|-------------|
| Merge worker.js keeping remote version | 09/08/2026 | Day đủ hàm Supabase, refactoring API routes |
| Configure transport_fallback per-source | 09/08/2026 | Ưu tiên `['browser_run', 'unlocker']` cho sources quan trọng |
| Push code + update README lên GitHub | 09/08/2026 | Commit `f0b0586` xong, 4 commits deploy |
| Completed CRITICAL/Important via skills system | 09/08/2026 | 6/6 tasks pass (5/5 transport tests, 9/9 classification tests) |

## 🔄 NEXT SESSION RECALL GUIDE

Khi mở session mới, dùng tìm kiếm để recall:
- `recall "mtkdemandengines transport"` - để lấy lại kết quả test transport
- `recall "skills system completion"` - để lấy lại bảng trạng thái 6 tasks
- `recall "live site issue"` - để lấy lại cấu hình live site debug

## ⚠️ LƯU Ý CHO SESSION SAU

1. **Live site:** Cần check thủ công browser do constraint curl trên Windows
2. **Skill agents:** Đã tạo framework, cần điền nội dung `.md` thực tế
3. **Project tasks:** 4 mục pending từ roadmap chưa xong

---
*File này được lưu truẩn cho session mới - có thể dùng `recall` để lấy lại context*