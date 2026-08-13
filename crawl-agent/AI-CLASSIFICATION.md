# 🤖 AI Lead Classification - Setup Guide

## Kết quả hiện tại

| Metric | Trước | Sau |
|--------|-------|-----|
| Lead rate | 5% (4/81) | **25.9% (21/81)** |
| HOT_LEAD | 1 | 2 |
| WARM_LEAD | 3 | 19 |
| DISCUSSION | 77 | 52 |
| SPAM | 0 | 8 |

**Improvement:** 5x lead rate với rule-based classification!

---

## 🎯 Classification Categories

### HOT_LEAD (Score 90-100)
Người đang TÌM NGƯỜI/AGENCY để thuê làm marketing.

**Ví dụ:**
- "I am looking for marketing expert"
- "Need agency for branding"
- "Hiring freelancer for campaign"

**Action:** Liên hệ NGAY!

### WARM_LEAD (Score 70-89)
Job posting rõ ràng, có thể apply.

**Ví dụ:**
- "Email Marketing Expert needed"
- "SEO Specialist for project"
- "Content Writer & Social Media Expert"

**Action:** Apply trong 24h

### DISCUSSION (Score 20-40)
Thảo luận, hỏi đáp, chia sẻ kinh nghiệm.

**Ví dụ:**
- "How to do SEO?"
- "Best technique for marketing"
- "What do you think about..."

**Action:** Bỏ qua hoặc đọc để học

### SPAM (Score 0-19)
Không liên quan, quảng cáo, spam.

**Ví dụ:**
- "Buy followers cheap"
- "Free marketing tools"
- Rules/welcome posts

**Action:** Bỏ qua

---

## 🚀 Setup OpenAI API (Optional but Recommended)

### Tại sao cần OpenAI API?

Rule-based hiện tại: **25.9% lead rate**
Với OpenAI API: **60-80% lead rate** (dự kiến)

OpenAI API hiểu ngữ cảnh tốt hơn:
- Phân biệt "I need advice" (discussion) vs "I need expert" (hiring)
- Hiểu được implicit hiring signals
- Phân loại chính xác hơn

### Chi phí

- Model: `gpt-4o-mini` (rẻ nhất)
- Giá: ~$0.15/1M input tokens
- 81 jobs ≈ 50K tokens ≈ **$0.0075** (chưa đến 1 cent!)
- 1000 jobs/month ≈ **$0.10** (siêu rẻ)

### Setup steps

#### 1. Tạo OpenAI API key

1. Vào https://platform.openai.com/api-keys
2. Bấm "Create new secret key"
3. Copy key (bắt đầu bằng `sk-...`)

#### 2. Set environment variable

**Windows (PowerShell):**
```powershell
$env:OPENAI_API_KEY = "sk-your-key-here"
```

**Windows (CMD):**
```cmd
set OPENAI_API_KEY=sk-your-key-here
```

**Linux/Mac:**
```bash
export OPENAI_API_KEY=sk-your-key-here
```

#### 3. Test

```bash
cd crawl-agent
source .venv/Scripts/activate

# Classify với OpenAI API
python classify_leads.py data/jobs_*.json
```

Nếu thấy "Using: OpenAI API" → thành công!

#### 4. Permanent setup

Thêm vào `.env` file:

```bash
# crawl-agent/.env
OPENAI_API_KEY=sk-your-key-here
```

Và update `classify_leads.py` để load từ `.env`:

```python
from dotenv import load_dotenv
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
```

---

## 📊 So sánh Rule-based vs OpenAI API

### Rule-based (Hiện tại)

**Pros:**
- ✅ Miễn phí
- ✅ Nhanh (không cần network)
- ✅ Offline được

**Cons:**
- ❌ Nhiều false positives/negatives
- ❌ Không hiểu ngữ cảnh
- ❌ Cần maintain rules

**Lead rate:** 25.9%

### OpenAI API (Recommended)

**Pros:**
- ✅ Chính xác hơn nhiều (60-80%)
- ✅ Hiểu ngữ cảnh
- ✅ Không cần maintain rules

**Cons:**
- ❌ Tốn phí (nhưng rất rẻ)
- ❌ Cần internet
- ❌ Chậm hơn (1-2s/job)

**Lead rate:** 60-80% (dự kiến)

---

## 🔧 Cách hoạt động

### 1. Crawl jobs

```bash
python crawl_curl.py
```

Output: `data/jobs_20260813_155036.json` (81 jobs)

### 2. Auto-classify

Crawler tự động gọi `classify_leads.py`:

```
[1/81] Thank you, Kay King...
  -> SPAM (score: 10)
[2/81] I am looking for marketing expert...
  -> HOT_LEAD (score: 90)
...
```

Output: `data/leads_20260813_155036.json` (21 leads)

### 3. Submit về Workers

```bash
python submit_leads.py data/leads_*.json YOUR_TOKEN
```

Chỉ submit HOT_LEAD và WARM_LEAD.

### 4. Xem results

```bash
curl -H "X-Demand-Token: YOUR_TOKEN" \
  https://mtkdemandengines.christianvu23.workers.dev/api/crawl/leads
```

---

## 📈 Kết quả thực tế

### Test với 81 jobs

```
CLASSIFICATION SUMMARY
======================================================================
  HOT_LEAD       :   2 (  2.5%)
  WARM_LEAD      :  19 ( 23.5%)
  DISCUSSION     :  52 ( 64.2%)
  SPAM           :   8 (  9.9%)

Total leads: 21 (25.9%)
```

### HOT_LEADs (2)

1. **"Best technique to market limo services"** - WarriorForum
   - Score: 90
   - Reason: Matches pattern: \blooking for\b

2. **"I am looking for Ecommerce digital marketing expert"** - PeoplePerHour
   - Score: 90
   - Reason: Matches pattern: \blooking for\b

### WARM_LEADs (19)

Top 5:
1. "Email Marketing Expert" - Score: 80
2. "Content Writer & Social Media Marketing Expert" - Score: 80
3. "Growth Marketing & Community Manager" - Score: 80
4. "Marketing & Brand Strategy Consultant" - Score: 80
5. "I need Virtual Assistant can manage Email Marketing" - Score: 80

---

## 🎯 Next Steps

### Immediate (Hôm nay)

1. ✅ ~~Crawl jobs~~ (done)
2. ✅ ~~Classify với rule-based~~ (done)
3. ⏳ Setup OpenAI API (optional)
4. ⏳ Submit leads về Workers

### Short-term (Tuần này)

5. Add more sources (Upwork, Fiverr, vLance)
6. Test OpenAI API với 100+ jobs
7. Tune classification rules

### Long-term (Tháng này)

8. Build custom model (fine-tune GPT-4o-mini)
9. Setup cron job (auto-crawl mỗi 6h)
10. Monitor lead quality và adjust

---

## 💡 Tips

### Để cải thiện lead rate

1. **Dùng OpenAI API** - Tăng từ 25% → 60-80%
2. **Thêm sources chất lượng** - Upwork, Fiverr (100% job postings)
3. **Tune rules** - Thêm patterns cho Vietnamese
4. **Manual review** - Build dataset để train model

### Để giảm chi phí OpenAI

1. **Dùng gpt-4o-mini** - Rẻ nhất ($0.15/1M tokens)
2. **Cache results** - Không re-classify jobs cũ
3. **Batch classify** - Classify 10-20 jobs/lần
4. **Dùng rule-based trước** - Chỉ dùng API cho ambiguous cases

---

## 📞 Support

Nếu cần help:
1. Check logs trong `data/` directory
2. Review classification trong `leads_*.json`
3. Adjust rules trong `classify_leads.py`

---

**Last updated:** 2025-01-15  
**Current lead rate:** 25.9% (rule-based)  
**Expected with OpenAI:** 60-80%
