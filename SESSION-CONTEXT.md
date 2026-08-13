# Session Context - Crawl Agent Development
**Date:** 2025-01-15  
**Status:** ✅ Performance fixed - Ready for production

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
   - Alibaba API (qwen3.8-max): 26.0% lead rate (21/81 jobs)
   - Categories: HOT_LEAD (2), WARM_LEAD (19), DISCUSSION (55), SPAM (5)

5. **Alibaba API Integration**
   - API key: `sk-sp-H.DEDXL.AEmS...` (token-plan)
   - Endpoint: `https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions`
   - Model: `qwen3.8-max` (reasoning model)
   - Config: `~/.bailian/config.json`

6. **✅ Performance Optimization (NEW)**
   - **Vấn đề cũ:** qwen3.8-max chậm (9s/job, 715s cho 81 jobs)
   - **Giải pháp:** Batch processing + disable reasoning
   - **Kết quả:** 0.94s/job, **76s cho 81 jobs** (9.4x nhanh hơn!)
   - File: `classify_fast.py`

---

## Vấn đề đã giải quyết

### ✅ Alibaba API chậm - ĐÃ FIX
- **Vấn đề:** qwen3.8-max là reasoning model, mất ~9s/job
- **Giải pháp:** 
  1. Disable reasoning: `chat_template_kwargs: {enable_thinking: false}`
  2. Batch processing: 10 jobs/request thay vì 1 job/request
- **Kết quả:** 715s → **76s** (9.4x nhanh hơn!)
- **File:** `classify_fast.py`

---

## Vấn đề còn lại

### Lead rate chưa cao (26%)
- Rule-based: 25.9%
- Alibaba API: 26.0% (tương đương rule-based)
- Cần improve classification logic hoặc add more sources

---

## Files quan trọng

### Crawl agent
```
crawl-agent/
├── crawl_curl.py              # Crawler chính (dùng curl_cffi)
├── classify_fast.py           # FAST classification (batch + no reasoning) ← DÙNG CÁI NÀY
├── classify_leads.py          # AI classification (chậm hơn, cho reference)
├── submit_leads.py            # Submit leads về Workers API
├── data/
│   ├── jobs_20260813_153809.json           # 81 jobs raw
│   ├── jobs_20260813_153809_fast_*.json    # 81 jobs đã classify (fast)
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

1. **Improve lead classification**
   - Review classification results
   - Tune classification prompt
   - Add more signals (job title patterns, source-specific rules)
   - Target: 40%+ lead rate

2. **Add more sources**
   - vLance (cần stealth mode)
   - BlackHatWorld (cần stealth mode)
   - Upwork, Fiverr (nếu có API)

3. **Submit leads về Workers**
   - Test submit với DEMAND_TOKEN
   - Verify leads appear trong dashboard

### Ưu tiên trung bình

4. **Setup cron job**
   - Auto-crawl mỗi 6 giờ
   - Auto-classify và submit

5. **Monitor và optimize**
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

### Classify với Alibaba API (FAST - recommended)
```bash
python classify_fast.py data/jobs_*.json --api-key "sk-sp-H.DEDXL.AEmS..."
```

### Classify với Alibaba API (slow - cho reference)
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
68a433f - perf: 9.4x faster classification with batch processing
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

**Session resumed:** 2025-01-15  
**Performance fix:** 9.4x faster (715s → 76s)  
**Resume command:** `cd crawl-agent && source .venv/Scripts/activate && python classify_fast.py data/jobs_*.json --api-key "sk-sp-H.DEDXL.AEmS..."`
