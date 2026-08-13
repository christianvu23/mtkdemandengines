# Session Context - Crawl Agent Development
**Date:** 2025-01-15  
**Status:** Paused - cần tiếp tục ở session mới

---

## Tổng kết session này

### Đã làm được

1. **Deploy Workers thành công**
   - URL: https://mtkdemandengines.christianvu23.workers.dev
   - Dashboard: /crawl-dashboard.html
   - API endpoints: /api/crawl/status, /api/crawl/run, /api/crawl/leads

2. **Setup Python crawl agent**
   - Virtual environment: `crawl-agent/.venv/`
   - Dependencies: scrapling, curl_cffi, httpx, loguru
   - Playwright browsers đã install

3. **Crawl data thành công**
   - Dùng `curl_cffi` để bypass anti-bot (Scrapling fetchers không work)
   - Sources: WarriorForum (61 jobs), PeoplePerHour (20 jobs)
   - Total: 81 jobs
   - Files: `data/jobs_20260813_153809.json`

4. **AI Classification**
   - Rule-based: 25.9% lead rate (21/81 jobs)
   - Alibaba API (qwen3.8-max): 24.7% lead rate (20/81 jobs)
   - Categories: HOT_LEAD (4), WARM_LEAD (16), DISCUSSION (55), SPAM (6)

5. **Alibaba API Integration**
   - API key: `sk-sp-H.DEDXL.AEmS...` (token-plan)
   - Endpoint: `https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions`
   - Model: `qwen3.8-max` (reasoning model)
   - Config: `~/.bailian/config.json`

---

## Vấn đề hiện tại

### 1. Alibaba API chậm
- **Vấn đề:** qwen3.8-max là reasoning model, mất ~9s/job
- **Kết quả:** 715s (12 phút) cho 81 jobs
- **Nguyên nhân:** Model có `reasoning_content` field, "suy nghĩ" trước khi trả lời

### 2. Các model khác không available
- qwen-turbo, qwen-plus, qwen-max → 404 Model not exist
- Chỉ có qwen3.8-max trên token-plan endpoint
- Cần tìm model nhanh hơn hoặc optimize

### 3. Lead rate chưa cao
- Rule-based: 25.9%
- Alibaba API: 24.7% (tương đương rule-based, không cải thiện)
- Cần improve classification logic

---

## Files quan trọng

### Crawl agent
```
crawl-agent/
├── crawl_curl.py              # Crawler chính (dùng curl_cffi)
├── classify_leads.py          # AI classification (OpenAI + Alibaba + rule-based)
├── submit_leads.py            # Submit leads về Workers API
├── data/
│   ├── jobs_20260813_153809.json           # 81 jobs raw
│   ├── jobs_alibaba_classified.json        # 81 jobs đã classify
│   └── leads_*.json                        # Filtered leads
└── .venv/                                  # Python virtual env
```

### Workers
```
src/
├── sources/freelance-crawler.js    # Crawler logic (Workers-compatible)
├── transport/crawl-api.js          # API endpoints
public/
└── crawl-dashboard.html            # Dashboard UI
```

---

## Next steps (cho session mới)

### Ưu tiên cao

1. **Fix Alibaba API performance**
   - Tìm model nhanh hơn (qwen-turbo-lightning? qwen2.5-72b-instruct?)
   - Hoặc batch processing (gửi nhiều jobs trong 1 request)
   - Hoặc cache results (không re-classify jobs cũ)

2. **Improve lead classification**
   - Review Alibaba API results vs rule-based
   - Tune classification prompt
   - Add more signals (job title patterns, source-specific rules)

3. **Add more sources**
   - vLance (cần stealth mode)
   - BlackHatWorld (cần stealth mode)
   - Upwork, Fiverr (nếu có API)

### Ưu tiên trung bình

4. **Submit leads về Workers**
   - Test submit với DEMAND_TOKEN
   - Verify leads appear trong dashboard

5. **Setup cron job**
   - Auto-crawl mỗi 6 giờ
   - Auto-classify và submit

6. **Monitor và optimize**
   - Track lead quality over time
   - A/B test classification methods
   - Adjust keywords và rules

---

## Commands để continue

### Activate virtual env
```bash
cd crawl-agent
source .venv/Scripts/activate
```

### Run crawler
```bash
python crawl_curl.py
```

### Classify với Alibaba API
```bash
python classify_leads.py data/jobs_*.json --api-key "sk-sp-H.DEDXL.AEmS..."
```

### Submit leads
```bash
python submit_leads.py data/leads_*.json YOUR_DEMAND_TOKEN
```

### Test Alibaba API speed
```bash
.venv/Scripts/python -c "
import httpx, time
api_key = 'sk-sp-H.DEDXL.AEmS.MEQCIBuUV997y8tLHoPUNFgyrysaoN35M__PcaMRrhYuM9ReAiAFrd7zm6N-c4ASbmLs0PUC7WrbtOeoJxFDb7hlXWWOww'
endpoint = 'https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions'
start = time.time()
response = httpx.post(endpoint, headers={'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'}, json={'model': 'qwen3.8-max', 'messages': [{'role': 'user', 'content': 'Test'}], 'max_tokens': 50}, timeout=60)
print(f'Time: {time.time() - start:.1f}s')
"
```

---

## API Keys & Config

### Alibaba API
- Key: `sk-sp-H.DEDXL.AEmS.MEQCIBuUV997y8tLHoPUNFgyrysaoN35M__PcaMRrhYuM9ReAiAFrd7zm6N-c4ASbmLs0PUC7WrbtOeoJxFDb7hlXWWOww`
- Endpoint: `https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions`
- Model: `qwen3.8-max`
- Config file: `~/.bailian/config.json`

### Workers API
- URL: `https://mtkdemandengines.christianvu23.workers.dev`
- Token: Cần hỏi user (DEMAND_TOKEN secret)

---

## Git commits

```
c42fd1a - feat: AI lead classification - lead rate 5% → 25.9%
30538c9 - feat: working crawler with curl_cffi - 81 jobs, 4 leads
60d4559 - docs: add TOM-TAT.md
65a8b49 - docs: update README, DEPLOYED, add STATUS
```

---

## Links quan trọng

- Project: https://github.com/christianvu23/mtkdemandengines
- Live site: https://mtkdemandengines.christianvu23.workers.dev
- Dashboard: https://mtkdemandengines.christianvu23.workers.dev/crawl-dashboard.html
- Docs: CRAWL-RESULTS.md, AI-CLASSIFICATION.md, TOM-TAT.md

---

**Session paused:** 2025-01-15  
**Resume command:** `cd crawl-agent && source .venv/Scripts/activate && python crawl_curl.py`
