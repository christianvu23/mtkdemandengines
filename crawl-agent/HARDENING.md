# Crawl Agent Hardening — 2026-08

Tài liệu ghi lại đợt gia cố crawl agent sau architecture review
(theo các skills: `data-scraper-agent`, `agent-architecture-audit`,
`loop-design-check`, `agent-harness-construction`).

> Nguyên tắc xuyên suốt: **MÁY ĐỀ XUẤT, NGƯỜI BẤM.**
> Máy chạy loop, đối chiếu, chặn lỗi — nhưng quyết định cuối (duyệt lead,
> sửa luật) luôn thuộc về người.

---

## 1. Idempotent submit — chặn lead trùng tại cổng nạp (CRITICAL)

**Vấn đề:** cron 30 phút cào lại cùng URL → `demand_inbox` đầy bản sao của
cùng một lead; merge chỉ chặn trùng ở bảng chính, còn dashboard bắt người
duyệt đi duyệt lại cùng một lead.

**Giải pháp — dedup 2 tầng ngay tại cổng nạp:**

```
POST /api/demand/nap
  │
  ├─ Tầng 1: locTrungTrongLo()  — bỏ lead_key trùng trong cùng 1 request
  └─ Tầng 2: dm_loc_keys_da_co() — RPC kiểm tra lead_key đã tồn tại trong
              demand_leads HOẶC demand_inbox chưa xử lý
  → chỉ insert phần khác biệt
```

| File | Vai trò |
|---|---|
| `db/migrations/20260814_loc_trung_inbox.sql` | RPC `dm_loc_keys_da_co(jsonb)` — chuẩn hoá key qua `dm_chuan_hoa_key` cho khớp luật merge |
| `src/core/loc-trung.js` | Hàm thuần dedup 2 tầng (unit-test được) |
| `src/services/supabase.js` | `napVaoInboxLocTrung()` — graceful fallback nếu RPC chưa chạy |

Áp dụng cho **cả 3 cổng nạp**: `/api/demand/nap`, `/api/crawl/submit`,
và queue handlers (đường cron).

**Đã kiểm chứng production:** gửi cùng 1 lead 2 lần →
lần 1 `da_day_vao_inbox: 1`, lần 2 `trung_lead_key: 1, da_day_vao_inbox: 0`.

Response API có thêm:
- `trung_lead_key` — số lead bị chặn trùng
- `loc_trung_kha_dung` — `false` nghĩa là migration chưa chạy (crawl agent log cảnh báo)

---

## 2. Reconciliation baseline — chống spider "chết lặng lẽ" (HIGH)

**Vấn đề:** selector vỡ hoặc site chặn → spider trả về 0 lead nhưng vẫn
được đếm là "thành công". Chỉ đếm `leads_submitted` là metric Goodhart —
loop chạy mãi trong im lặng.

**Giải pháp** (`utils/baseline.py`, hàm thuần):

| Tình huống | Kết luận |
|---|---|
| Run đầu tiên | `first_run` — ghi baseline, chưa kết luận |
| Có links | `ok` — cập nhật `last_good_links`, reset streak |
| 0 links, run đầu sau baseline | `watch` — theo dõi |
| Từng ra ≥3 links mà **2 run liên tiếp ra 0** | `degraded` — **CẦN NGƯỜI XEM** |

`BaseSpider.crawl()` trả thêm `parse_confidence`:
- `1.0` — fetch được và trích được links
- `0.2` — fetch được nhưng 0 link (selector hỏng HOẶC bị chặn HOẶC trang rỗng)
- `0.0` — không fetch được trang nào

State lưu tại `data/source_baseline.json`.

---

## 3. Circuit breaker + exponential backoff (HIGH)

**Vấn đề:** nguồn bị block 403 liên tục vẫn bị hammer mỗi 30 phút →
IP ban vĩnh viễn. `CRAWL_MAX_RETRIES` từng là config chết (khai báo nhưng
không dùng).

**Giải pháp:**

- `utils/circuit_breaker.py` — state per-source tại `data/circuit_state.json`:
  - **3 run liên tiếp không fetch được trang nào** → circuit MỞ, nguồn bị bỏ qua
  - Run thành công → circuit tự ĐÓNG
  - Ép chạy nguồn đang mở circuit: `python main.py run -s <source> --force`
- `BaseSpider.fetch_with_retry()` — retry với backoff `2s → 4s → …` (cap 60s),
  chỉ retry khi lỗi được phân loại là `retryable` (xem mục 6)

Config:
```
CRAWL_MAX_RETRIES=3            # số lần fetch tối đa mỗi URL
RETRY_BASE_DELAY_SECONDS=2     # delay backoff gốc
CIRCUIT_MAX_FAILURES=3         # số run fail trước khi mở circuit
```

> Phân công rõ ràng: **circuit breaker** trả lời "có fetch được không",
> **baseline** trả lời "có trích được link không". Hai câu hỏi khác nhau.

---

## 4. Feedback loop — học từ quyết định duyệt lead (HIGH)

**Vấn đề:** prompt phân loại tĩnh vĩnh viễn; quyết định duyệt/bỏ trên
dashboard không quay lại cải thiện hệ thống.

**Giải pháp** (theo pattern `ai/memory.py` của data-scraper-agent):

```
Dashboard (người duyệt) → demand_leads.status
        │
        ▼
GET /api/demand/phan-hoi          ← tín hiệu dương/âm
        │
        ▼
python scripts/update_feedback.py ← chạy sau mỗi đợt duyệt
        │
        ▼
data/feedback.json
        │
        ▼
classify_fast.py inject vào prompt ("lead người ĐÃ CHỌN / ĐÃ BỎ")
```

- Tín hiệu dương: `quan_tam`, `da_lien_he`, `dang_trao_doi`, `chot`
- Tín hiệu âm: `bo`
- **Red-line:** máy chỉ ĐỌC quyết định của người, không bao giờ tự ghi —
  judgment ở phía người.

---

## 5. Classify hardening (MEDIUM)

`classify_fast.py`:

- **Match theo marker `JOB-xx` duy nhất**, validate 1:1 giữa request và
  response. Lệch/thiếu marker → fallback rule-based **CHO CẢ BATCH**
  (không bao giờ trộn kết quả lệch dòng với kết quả đúng).
- **Bỏ `confidence: 0.8` hardcode** — derive từ score
  (`0.5 + 0.45 × |score−50|/50`, cap 0.95 — LLM luôn có xác suất sai).
- Bỏ `global BATCH_SIZE` mutation — truyền qua tham số.
- Inject feedback prompt (mục 4); tắt bằng `--no-feedback`.

---

## 6. Error recovery contract (MEDIUM)

**Vấn đề:** `stats["errors"]` chỉ chứa chuỗi thô — orchestrator không phân
biệt được "timeout retry được" với "bị block, càng retry càng bị ban".

**Giải pháp** (`utils/errors.py`, hàm thuần) — mọi lỗi giờ mang theo:

```json
{
  "phase": "listing",
  "url": "https://...",
  "error": "...",
  "kind": "blocked",
  "retryable": false,
  "hint": "Site đang chặn — ĐỪNG hammer tiếp. Escalate lên engine stealth/camoufox..."
}
```

| kind | retryable | Ý nghĩa |
|---|---|---|
| `blocked` (403/cloudflare/captcha) | ❌ | Dừng ngay, escalate engine |
| `rate_limited` (429) | ✅ | Tăng delay, giảm concurrency |
| `timeout` | ✅ | Tăng timeout |
| `dns_network` | ✅ | Retry backoff, kiểm tra proxy nếu lặp lại |
| `parse` | ❌ | Selector hỏng — cần người sửa |
| `robots_disallowed` | ❌ | Tôn trọng robots.txt, bỏ URL khỏi config |
| `url_unsafe` | ❌ | Kiểm tra lại config nguồn |

Summary `run_all()` có thêm `errors_by_kind` để biết nên xử lý gì tiếp.

---

## 7. URL guard — SSRF + robots.txt (LOW)

**Vấn đề:** crawl agent fetch URL từ config; config bị tiêm nhiễm có thể
dẫn tới SSRF. Và crawl không hỏi robots.txt là anti-pattern (pháp lý/đạo đức).

**Giải pháp** (`utils/url_guard.py`) — guard chạy **trước mọi fetch**:

- `is_safe_url()` chặn: scheme ngoài http/https, private IP, loopback,
  link-local (gồm **169.254.169.254** cloud metadata), host
  `localhost`/`*.internal`/`*.local`
- `RobotsCache` — đọc + cache robots.txt theo domain, ưu tiên nhóm
  User-agent cụ thể, **fail-open** khi site không đặt luật (ghi log)

Đã kiểm chứng robots.txt thực tế (2026-08): vlance, blackhatworld,
peopleperhour, freelancerviet, topcv — **tất cả cho phép crawl**.

---

## Kiểm chứng

```
JS:      117 tests pass  (tests/loc-trung.test.js mới)
Python:  75 tests pass   (tests/test_resilience, test_feedback,
                          test_errors, test_url_guard mới)
Production smoke test: dedup hoạt động (mục 1)
```

## Vận hành định kỳ

```bash
# Sau mỗi đợt duyệt lead trên dashboard — nạp tín hiệu vào bộ phân loại
python scripts/update_feedback.py

# Ép chạy nguồn đang bị circuit breaker chặn
python main.py run -s vlance --force

# Reset circuit/baseline khi đã sửa selector
# → xoá source tương ứng trong data/circuit_state.json, data/source_baseline.json
```

## Các finding còn mở (từ audit cũ, chưa thuộc đợt này)

- #82: Facebook Groups cần login cookie injection (đã document, chưa implement)
- #94: Camoufox memory limit khi chạy nhiều instance social song song
- #196: không log credential của FacebookGroupSpider
