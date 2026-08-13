# Hướng dẫn Submit Leads về Workers

## Bước 1: Lấy DEMAND_TOKEN

Token đã được cấu hình trong Cloudflare Workers secrets. Để lấy token:

### Option 1: Xem trong Cloudflare Dashboard
1. Vào https://dash.cloudflare.com
2. Chọn Workers & Pages
3. Chọn `mtkdemandengines`
4. Vào Settings → Variables
5. Tìm `DEMAND_TOKEN` trong Environment Variables

### Option 2: Tạo token mới
```bash
# Tạo token ngẫu nhiên
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Set vào Workers
npx wrangler secret put DEMAND_TOKEN
# Dán token vào
```

## Bước 2: Submit Leads

### Cách 1: Dùng script (recommended)
```bash
cd crawl-agent
source .venv/Scripts/activate

# Set token
export DEMAND_TOKEN="your-token-here"

# Submit
python submit_leads.py data/leads_to_submit.json
```

### Cách 2: Dùng curl
```bash
curl -X POST https://mtkdemandengines.christianvu23.workers.dev/api/crawl/submit \
  -H "X-Demand-Token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d @data/leads_to_submit.json
```

## Bước 3: Kiểm tra kết quả

### Xem trên Dashboard
Mở: https://mtkdemandengines.christianvu23.workers.dev/crawl-dashboard.html

### Xem qua API
```bash
# Xem trạng thái
curl -H "X-Demand-Token: YOUR_TOKEN" \
  https://mtkdemandengines.christianvu23.workers.dev/api/crawl/status

# Xem leads
curl -H "X-Demand-Token: YOUR_TOKEN" \
  https://mtkdemandengines.christianvu23.workers.dev/api/crawl/leads
```

## Kết quả hiện tại

- **Tổng jobs:** 208
- **HOT_LEAD:** 8 (3.8%)
- **WARM_LEAD:** 54 (26.0%)
- **Tổng leads:** 62 (29.8%)

### Sources
- PeoplePerHour: 60 jobs
- Freelancer.com: 148 jobs

### Sample HOT_LEADs
1. "Emails marketing campagn for our digital marketing services" - Score: 95
2. "I need constant leads for a marketing company" - Score: 96
3. "I am looking for Ecommerce digital marketing expert" - Score: 94

## Next Steps

Sau khi submit thành công:
1. ✅ Review leads trên dashboard
2. ✅ Setup cron job (auto-crawl mỗi 6h)
3. ✅ Thêm nhiều sources hơn
4. ✅ Improve classification logic
