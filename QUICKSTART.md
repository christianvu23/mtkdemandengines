# Quick Start Guide

Hướng dẫn nhanh cách sử dụng MTK Demand Engines.

---

## 🚀 Truy cập nhanh

| Mục đích | Link |
|----------|------|
| **Xem leads** | https://mtkdemandengines.christianvu23.workers.dev/leads.html |
| **Dashboard duyệt lead** | https://mtkdemandengines.christianvu23.workers.dev/app |
| **API leads (JSON)** | https://mtkdemandengines.christianvu23.workers.dev/api/demand/inbox |

---

## 📖 Sử dụng cơ bản

### 1. Xem leads đã quét

Mở browser vào: https://mtkdemandengines.christianvu23.workers.dev/leads.html

- Filter theo hạng (A/B/C/D)
- Filter theo nguồn
- Xem chi tiết từng lead (title, score, contact, budget)

### 2. Quét nguồn mới

```bash
# Quét 1 nguồn cụ thể
curl -X POST \
  -H "X-Demand-Token: mkt-demangen-2026" \
  "https://mtkdemandengines.christianvu23.workers.dev/api/demand/quet?nguon=vieclam24h"

# Quét tất cả nguồn đang bật
curl -X POST \
  -H "X-Demand-Token: mkt-demangen-2026" \
  "https://mtkdemandengines.christianvu23.workers.dev/api/demand/quet"
```

### 3. Kiểm tra trạng thái sources

```bash
curl https://mtkdemandengines.christianvu23.workers.dev/api/demand/trang-thai
```

### 4. Merge leads vào bảng chính

1. Mở https://mtkdemandengines.christianvu23.workers.dev/app
2. Đăng nhập bằng GitHub
3. Bấm **"Nạp lead mới"**

---

## 🔧 Cấu hình nguồn mới

### Bước 1: Thêm source vào DB

```javascript
// Dùng Supabase REST API
const SUPABASE_URL = 'https://emkwknwcyyewevmmoxzj.supabase.co';
const SERVICE_KEY = '<your-service-key>';

await fetch(`${SUPABASE_URL}/rest/v1/demand_sources`, {
  method: 'POST',
  headers: {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    ma: 'newsource',
    ten: 'New Source',
    loai: 'job_board',
    transport: 'browser_run',
    dang_bat: true,
    cau_hinh: {
      url_danh_sach: 'https://example.com/jobs',
      regex_link_bai: 'example\\.com/job/\\d+'
    }
  })
});
```

### Bước 2: Test quét

```bash
curl -X POST \
  -H "X-Demand-Token: mkt-demangen-2026" \
  "https://mtkdemandengines.christianvu23.workers.dev/api/demand/quet?nguon=newsource"
```

### Bước 3: Kiểm tra kết quả

```bash
curl https://mtkdemandengines.christianvu23.workers.dev/api/demand/inbox
```

---

## 🎯 Các transport có sẵn

| Transport | Khi nào dùng | Chi phí |
|-----------|--------------|---------|
| `truc_tiep` | Site không chặn bot | Miễn phí |
| `browser_run` | Site render bằng JS | $0.09/giờ (10h/tháng free) |
| `unlocker` | Site có anti-bot mạnh | Theo request |
| `nap_tay` | Nhập nội dung thủ công | Miễn phí |

---

## 📊 Hiểu về scoring

### Tier A (75-100 điểm)
- Lead nóng, có contact rõ ràng
- Ngân sách cụ thể
- Deadline gần
- **→ Liên hệ ngay**

### Tier B (60-74 điểm)
- Lead tiềm năng
- Có thể thiếu 1-2 yếu tố
- **→ Liên hệ trong 24h**

### Tier C (45-59 điểm)
- Lead ấm
- Cần làm giàu thêm thông tin
- **→ Liên hệ trong tuần**

### Tier D (<45 điểm)
- Lead lạnh
- Thiếu nhiều thông tin
- **→ Ưu tiên thấp**

---

## 🐛 Troubleshooting

### Lỗi "Worker chưa cấu hình DEMAND_TOKEN"
→ Secret chưa được set trên Workers. Chạy:
```bash
npx wrangler secret put DEMAND_TOKEN
```

### Lỗi "Thiếu credential Supabase"
→ Set secrets:
```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_KEY
```

### Quét không trả về leads
→ Kiểm tra:
1. Source có `dang_bat: true` không?
2. `url_danh_sach` có đúng không?
3. `regex_link_bai` có khớp URL thật không?

### Title hiển thị HTML raw
→ Đã fix! Hệ thống giờ strip HTML tags và parse frontmatter.

---

## 📞 Liên hệ hỗ trợ

- **GitHub Issues:** https://github.com/christianvu23/mtkdemandengines/issues
- **Documentation:** Xem thư mục `docs/` trong repo

---

**Last updated:** 2026-08-13
