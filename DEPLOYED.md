# ✅ DEPLOYED — Crawl Agent đã sẵn sàng

## Status: LIVE

**URL:** https://mtkdemandengines.christianvu23.workers.dev

**Dashboard:** https://mtkdemandengines.christianvu23.workers.dev/crawl-dashboard.html

---

## Cách sử dụng

### 1. Mở Dashboard

Truy cập: https://mtkdemandengines.christianvu23.workers.dev/crawl-dashboard.html

### 2. Nhập DEMAND_TOKEN

Bạn cần nhập DEMAND_TOKEN để API hoạt động. Token này đã được cấu hình trong Workers secrets.

### 3. Chạy Crawl

Bấm nút **"Chạy Crawl"** để bắt đầu crawl data từ:
- vLance.vn (freelance marketplace)
- BlackHatWorld (marketing forum)
- WarriorForum (internet marketing forum)

### 4. Xem Results

Sau khi crawl xong, dashboard sẽ hiển thị:
- **Tổng items** — Số items crawl được
- **Job Leads** — Số leads có signal tuyển dụng
- **Sources** — Chi tiết từng nguồn
- **Lead List** — Danh sách leads với title, link, description

---

## API Endpoints

Tất cả endpoints đều cần header `X-Demand-Token`:

```bash
# Xem trạng thái
curl -H "X-Demand-Token: YOUR_TOKEN" \
  https://mtkdemandengines.christianvu23.workers.dev/api/crawl/status

# Chạy crawl
curl -X POST \
  -H "X-Demand-Token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' \
  https://mtkdemandengines.christianvu23.workers.dev/api/crawl/run

# Xem results
curl -H "X-Demand-Token: YOUR_TOKEN" \
  https://mtkdemandengines.christianvu23.workers.dev/api/crawl/results

# Xem leads
curl -H "X-Demand-Token: YOUR_TOKEN" \
  https://mtkdemandengines.christianvu23.workers.dev/api/crawl/leads
```

---

## Kiểm tra nhanh

```bash
# 1. Check status (cần token)
curl -k -H "X-Demand-Token: YOUR_TOKEN" \
  https://mtkdemandengines.christianvu23.workers.dev/api/crawl/status

# 2. Chạy crawl
curl -k -X POST \
  -H "X-Demand-Token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' \
  https://mtkdemandengines.christianvu23.workers.dev/api/crawl/run

# 3. Xem leads
curl -k -H "X-Demand-Token: YOUR_TOKEN" \
  https://mtkdemandengines.christianvu23.workers.dev/api/crawl/leads
```

---

## Lưu ý

1. **Token:** Nếu không có token, API sẽ trả về `{"loi": "Sai hoặc thiếu token"}`

2. **Selectors:** Hiện tại CSS selectors là guesses. Nếu crawl được 0 items, cần:
   - Fetch HTML thật từ sites
   - Update selectors trong `src/sources/freelance-crawler.js`
   - Deploy lại

3. **Browser Rendering:** Nếu có `CLOUDFLARE_ACCOUNT_ID` và `CLOUDFLARE_API_TOKEN` trong secrets, crawler sẽ dùng Cloudflare Browser Rendering để bypass anti-bot.

4. **Results cache:** Results được lưu trong memory. Restart Worker sẽ mất cache.

---

## Next Steps

1. ✅ **Deploy thành công**
2. 🔄 **Test crawl** — Mở dashboard và chạy thử
3. 🔍 **Review results** — Kiểm tra chất lượng data
4. 🎯 **Tune selectors** — Update nếu cần
5. 📈 **Monitor** — Theo dõi hiệu quả qua thời gian

---

**Deployed at:** 2025-01-15
**Version ID:** 011a0dd3-7ef7-4bfd-a3b5-247628c9a19e
