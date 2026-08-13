# Hướng dẫn Crawl Data & Deploy

## Tổng quan

Hệ thống crawl data từ các nguồn:
- **vLance.vn** — Freelance marketplace Việt Nam
- **BlackHatWorld** — Marketing forum (marketplace, social media)
- **WarriorForum** — Internet marketing forum

## Deploy lên Production

### 1. Deploy Workers

```bash
cd /c/Users/ADMIN/mtkdemandengines

# Deploy lên Cloudflare Workers
npx wrangler deploy
```

### 2. Kiểm tra API

Sau khi deploy, kiểm tra các endpoints:

```bash
# Xem trạng thái crawl
curl https://mtkdemandengines.christianvu23.workers.dev/api/crawl/status \
  -H "X-Demand-Token: YOUR_TOKEN"

# Xem sources được cấu hình
curl https://mtkdemandengines.christianvu23.workers.dev/api/crawl/sources \
  -H "X-Demand-Token: YOUR_TOKEN"
```

### 3. Chạy Crawl

**Cách 1: Qua Dashboard (Recommended)**

Mở: https://mtkdemandengines.christianvu23.workers.dev/crawl-dashboard.html

1. Nhập DEMAND_TOKEN
2. Bấm "Chạy Crawl"
3. Xem results trực tiếp trên dashboard

**Cách 2: Qua API**

```bash
# Chạy crawl tất cả sources
curl -X POST https://mtkdemandengines.christianvu23.workers.dev/api/crawl/run \
  -H "X-Demand-Token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Chạy crawl 1 source cụ thể
curl -X POST https://mtkdemandengines.christianvu23.workers.dev/api/crawl/run \
  -H "X-Demand-Token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source": "vlance"}'
```

### 4. Xem Results

```bash
# Xem tất cả results
curl https://mtkdemandengines.christianvu23.workers.dev/api/crawl/results \
  -H "X-Demand-Token: YOUR_TOKEN"

# Xem job leads (đã filter)
curl https://mtkdemandengines.christianvu23.workers.dev/api/crawl/leads \
  -H "X-Demand-Token: YOUR_TOKEN"
```

## Chạy Local (Test)

### 1. Chạy crawler trực tiếp

```bash
# Crawl tất cả sources
node scripts/crawl-data.mjs

# Chỉ crawl vLance
node scripts/crawl-data.mjs vlance

# Chỉ lấy job leads
node scripts/crawl-data.mjs --leads-only
```

Results sẽ được lưu vào `data/crawl-results/`

### 2. Chạy Workers local

```bash
# Start dev server
npx wrangler dev

# Truy cập dashboard
open http://localhost:8787/crawl-dashboard.html
```

## API Endpoints

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/crawl/status` | GET | Xem trạng thái crawl |
| `/api/crawl/sources` | GET | List sources được cấu hình |
| `/api/crawl/run` | POST | Trigger crawl |
| `/api/crawl/results` | GET | Xem crawl results |
| `/api/crawl/leads` | GET | Xem job leads đã filter |

## Cấu trúc dữ liệu

### Crawl Result

```json
{
  "name": "vLance.vn",
  "items": [
    {
      "title": "Cần tìm người thiết kế logo",
      "link": "https://vlance.vn/du-an/...",
      "description": "Tôi cần người thiết kế logo cho công ty...",
      "source": "vlance.vn",
      "crawledAt": "2025-01-15T10:00:00Z"
    }
  ],
  "total": 10
}
```

### Job Lead (đã filter)

Lead được filter dựa trên keywords:
- Vietnamese: "cần tìm", "tìm người", "thuê ngoài", "cần chạy ads"...
- English: "looking for", "hiring", "need marketing"...

## Troubleshooting

### Lỗi 401 Unauthorized

```bash
# Kiểm tra token
curl https://mtkdemandengines.christianvu23.workers.dev/api/crawl/status \
  -H "X-Demand-Token: YOUR_TOKEN"
```

Đảm bảo token đúng với `DEMAND_TOKEN` secret trong Workers.

### Lỗi "No crawl results yet"

Chưa chạy crawl lần nào. Bấm "Chạy Crawl" trên dashboard hoặc:

```bash
curl -X POST https://mtkdemandengines.christianvu23.workers.dev/api/crawl/run \
  -H "X-Demand-Token: YOUR_TOKEN"
```

### Crawl trả về 0 items

Có thể do:
1. Site thay đổi cấu trúc HTML → cần update selectors
2. Site block request → check logs
3. Network timeout → thử lại

Kiểm tra HTML thật bằng cách:
```bash
# Fetch và xem HTML
curl https://vlance.vn/viec-lam-freelance/marketing | head -100
```

## Thêm Source mới

Edit `src/sources/freelance-crawler.js`:

```javascript
export const CRAWL_SOURCES = {
  // ... existing sources

  new_source: {
    name: 'New Forum',
    urls: ['https://newforum.com/marketing/'],
    selectors: {
      listing: '.thread-item, .post-item',
      title: 'h3 a, .title',
      link: 'a[href*="/thread/"]',
      description: '.summary, .excerpt',
    },
  },
};
```

Deploy lại: `npx wrangler deploy`

## Cron Job (Tự động crawl)

Để tự động crawl mỗi 6 giờ, thêm vào `wrangler.toml`:

```toml
[triggers]
crons = ["0 */6 * * *"]
```

Và thêm handler trong `worker.js`:

```javascript
async scheduled(event, env, ctx) {
  if (event.cron === '0 */6 * * *') {
    ctx.waitUntil(handleRunCrawl(new Request('https://internal/cron'), env));
  }
}
```

## Metrics & Monitoring

Sau mỗi lần crawl, kiểm tra:
- **Total items**: Số items crawl được
- **Total leads**: Số job leads (đã filter)
- **Duration**: Thời gian crawl

Nếu leads quá ít (< 5), có thể:
1. Site ít job → thêm sources khác
2. Selectors sai → update lại
3. Keywords filter quá strict → thêm keywords

## Next Steps

1. **Deploy lên production** — `npx wrangler deploy`
2. **Chạy crawl thử** — Bấm "Chạy Crawl" trên dashboard
3. **Review leads** — Kiểm tra chất lượng leads
4. **Tune keywords** — Thêm/bớt keywords filter
5. **Add sources** — Thêm forums/sites khác
6. **Setup cron** — Tự động crawl định kỳ
