# Graph Report - mtkdemandengines  (2026-08-13)

## Corpus Check
- 115 files · ~84,725 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1204 nodes · 1676 edges · 80 communities (71 shown, 9 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 47 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0b199825`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- nap-lead.js
- test_smoke.py
- 🏗️ Skill 3: improve-codebase-architecture — Deep Architectural Improvements
- forum.py
- Config
- spiders/__init__.py
- opencode.json
- 🤖 AI Lead Classification - Setup Guide
- worker.js
- package.json
- 📊 Báo Cáo Tiến Độ - Crawl Agent
- Crawl Agent — Verification Report
- Session Context - Crawl Agent Development
- Quick Start Guide
- Changelog
- main
- 🎉 CRAWL AGENT - KẾT QUẢ THỰC TẾ
- crawl-api.js
- Code Review: mtkdemandengines (Phase 2)
- .scrape
- CrawlOrchestrator
- BaseSpider
- MTK Demand Engines — Crawl Agent
- Hướng dẫn deploy Demand Engine
- cao-tu-dong.mjs
- Design System Master File
- test_resilience.py
- Hướng dẫn Submit Leads về Workers
- is_lead_signal
- 🚀 Deploy Status
- 2. Bộ test và thứ chúng bảo vệ
- crawl_multi_source.py
- Hướng dẫn Quét & Nạp Lead
- 📋 Tóm Tắt Tình Hình — 2026-08-13
- Kiến trúc kỹ thuật — Demand Engine
- WorkersClient
- fix-raw-text.mjs
- README.md
- Luồng tự động (pipeline):
- 📊 Project Status
- build_preference_prompt
- ScraplingEngine
- Cấu hình & secret — Demand Engine
- demand-engine-mcp-server
- scrape-vlance.js
- 📊 TRẠNG THÁI HIỆN TẠI
- orchestrator.py
- test_stealth.py
- Page Override — app.html (dashboard duyệt lead)
- auto-scrape-flow.js
- Session State - mtkdemandengines Project
- crawl-agent.js
- analyze_url
- 🔧 Setup & Development
- TikTokSpider
- FreelancerComVNSpider
- PeoplePerHourSpider
- Job123Spider
- submit_leads
- test_curl_cffi
- test_dynamic
- test_fetcher
- test_architecture_review.py
- Page Override — index.html (landing marketing)
- 🛠️ API Endpoints
- 📊 Lead Scoring
- 📊 Kết quả thực tế
- 🧪 Tests
- 📋 Tổng quan
- mcp.test.js
- add-new-sources.mjs
- submit-sample-leads.mjs
- JobBoardVNSpider
- UpworkVNSpider

## God Nodes (most connected - your core abstractions)
1. `BaseSpider` - 44 edges
2. `CamoufoxEngine` - 26 edges
3. `WorkersClient` - 24 edges
4. `Config` - 18 edges
5. `chamDiem()` - 18 edges
6. `napLead()` - 17 edges
7. `CrawlOrchestrator` - 16 edges
8. `ScraplingEngine` - 15 edges
9. `is_lead_signal()` - 13 edges
10. `chuanHoaText()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `queue()` --calls--> `xuLyMotMessage()`  [EXTRACTED]
  worker.js → src/queue/handlers.js
- `fetch()` --calls--> `handleCrawlApi()`  [EXTRACTED]
  worker.js → src/transport/crawl-api.js
- `CrawlOrchestrator` --uses--> `Config`  [INFERRED]
  crawl-agent/orchestrator.py → crawl-agent/config.py
- `BaseSpider` --uses--> `Config`  [INFERRED]
  crawl-agent/spiders/base.py → crawl-agent/config.py
- `TestLeadSignalDetection` --uses--> `Config`  [INFERRED]
  crawl-agent/tests/test_unit.py → crawl-agent/config.py

## Import Cycles
- None detected.

## Communities (80 total, 9 thin omitted)

### Community 0 - "nap-lead.js"
Cohesion: 0.05
Nodes (62): DINH_DANG, moTaLead(), server, transport, boDau(), chuanHoaKey(), chuanHoaText(), doTuongDong() (+54 more)

### Community 1 - "test_smoke.py"
Cohesion: 0.05
Nodes (29): is_lead_signal(), Smoke Tests — Zero Dependencies ================================ Tests that run…, Different URLs should remain separate., Test lead format matches Workers API contract., Lead must have required fields for nap-lead.js., noiDung must be >= 20 chars (nap-lead.js requirement)., Test configuration structure (without importing config.py)., All source codes should be unique. (+21 more)

### Community 2 - "🏗️ Skill 3: improve-codebase-architecture — Deep Architectural Improvements"
Cohesion: 0.05
Nodes (42): After Skill 1 (archify):, After Skill 2 (code-review):, After Skill 3 (improve-codebase-architecture):, Architecture Diagram Features:, Architecture Insights Visible in Diagram:, Deliverable:, Expected HTML Report Structure:, Expected Output: (+34 more)

### Community 3 - "forum.py"
Cohesion: 0.11
Nodes (11): BlackHatWorldSpider, BrandsVietnamSpider, Forum Spider — Crawls marketing forums for lead signals.…, Spider for WarriorForum — one of the largest internet marketing forums., Spider for VOZ forum marketing section (voz.vn). Vietnamese tech/marketing…, Spider for BrandsVietnam.com — Premier Vietnamese marketing & branding…, Spider for VietnamMarketing.com.vn — Vietnamese marketing community. Has…, Spider for BlackHatWorld marketplace & forums. BHW has a marketplace section… (+3 more)

### Community 4 - "Config"
Cohesion: 0.09
Nodes (17): Config, Agent configuration — all settings from env or defaults., Unit Tests — Core Logic (Test-Driven Development)…, Test configuration validation., Test lead format matches Workers API contract., Lead must have required fields for /api/demand/nap., noiDung must not be empty (nap-lead.js requires >= 20 chars)., Test keyword list completeness. (+9 more)

### Community 5 - "spiders/__init__.py"
Cohesion: 0.05
Nodes (24): CareerVietSpider, ContraVNSpider, FastlanceSpider, FreelancerVNSpider, GigHitSpider, JobsGoSpider, Freelancer Spider — Crawls Vietnamese & international freelancer job boards.…, Spider for Freelancer.vn — another Vietnamese freelance marketplace. (+16 more)

### Community 6 - "opencode.json"
Cohesion: 0.06
Nodes (36): agent, deploy, autoupdate, git *, node *, npm *, npx *, wrangler * (+28 more)

### Community 7 - "🤖 AI Lead Classification - Setup Guide"
Cohesion: 0.06
Nodes (35): 1. Crawl jobs, 1. Tạo OpenAI API key, 2. Auto-classify, 2. Set environment variable, 3. Submit về Workers, 3. Test, 4. Permanent setup, 4. Xem results (+27 more)

### Community 8 - "worker.js"
Cohesion: 0.13
Nodes (34): locTrungDaCo(), locTrungTrongLo(), napNhieuLead(), chuanBiMessageQuetNguon(), xuLyLayBai(), xuLyMotMessage(), xuLyQuetNguon(), capNghenguon() (+26 more)

### Community 9 - "package.json"
Cohesion: 0.06
Nodes (32): dotenv, @modelcontextprotocol/sdk, allowScripts, esbuild@0.28.1, workerd@1.20260811.1, dependencies, dotenv, @modelcontextprotocol/sdk (+24 more)

### Community 10 - "📊 Báo Cáo Tiến Độ - Crawl Agent"
Cohesion: 0.07
Nodes (29): Bài học rút ra, 📊 Báo Cáo Tiến Độ - Crawl Agent, Check results, Classify jobs, 📞 Commands Quick Reference, Core Scripts, Crawl jobs, Data Files (+21 more)

### Community 11 - "Crawl Agent — Verification Report"
Cohesion: 0.07
Nodes (28): 1. TEST RESULTS SUMMARY, 2. ARCHITECTURE REVIEW (5-Axis Code Review), 3. DOUBT-DRIVEN ADVERSARIAL REVIEW, 4. % FIT ASSESSMENT, 5. CRITICAL BLOCKERS (Must Fix Before Production), 6. RECOMMENDATION, 7. TEST COVERAGE, 8. VERIFICATION COMMANDS (+20 more)

### Community 12 - "Session Context - Crawl Agent Development"
Cohesion: 0.08
Nodes (25): Activate virtual env, Alibaba API, ✅ Alibaba API chậm - ĐÃ FIX, API Keys & Config, Classify với Alibaba API (FAST - recommended), Classify với Alibaba API (slow - cho reference), Commands để continue, Crawl agent (+17 more)

### Community 13 - "Quick Start Guide"
Cohesion: 0.08
Nodes (23): 1. Xem leads đã quét, 2. Quét nguồn mới, 3. Kiểm tra trạng thái sources, 4. Merge leads vào bảng chính, Bước 1: Thêm source vào DB, Bước 2: Test quét, Bước 3: Kiểm tra kết quả, 🎯 Các transport có sẵn (+15 more)

### Community 14 - "Changelog"
Cohesion: 0.09
Nodes (21): [2026-08-08] - Initial setup, [2026-08-09] - Phase 2: Worker refactoring, [2026-08-11] - Skills system completion, [2026-08-13-fix2] - Fix filtering logic, [2026-08-13] - Pipeline hoạt động端到端, Added, Added, Added (+13 more)

### Community 15 - "main"
Cohesion: 0.14
Nodes (19): classify_job(), classify_jobs(), classify_rule_based(), main(), Fallback: Rule-based classification khi không có API., Classify tất cả jobs từ file., Classify một job dùng LLM API. Args: job: Job data dict api_key: API key…, crawl_site() (+11 more)

### Community 16 - "🎉 CRAWL AGENT - KẾT QUẢ THỰC TẾ"
Cohesion: 0.10
Nodes (20): 1. Crawl data, 2. Submit leads về Workers, 3. Xem results, 📊 API Endpoints, 🎉 CRAWL AGENT - KẾT QUẢ THỰC TẾ, 🚀 Cách sử dụng, 📁 Files đã tạo, Freelancer.com không extract được jobs (+12 more)

### Community 17 - "crawl-api.js"
Cohesion: 0.21
Nodes (18): args, DATA_DIR, leadsOnly, main(), sourceArg, CRAWL_SOURCES, crawlAllSources(), crawlPage() (+10 more)

### Community 18 - "Code Review: mtkdemandengines (Phase 2)"
Cohesion: 0.10
Nodes (19): 1. **Worker.js Refactoring (HIGHEST Priority)**, 2. **Learner Module Deferred** (MEDIUM Priority), 3. **Transport Testing Gap** (LOW Priority), 4. **UI Auto-Merge Not Implemented** (LOW Priority), ⚠️ **Areas Requiring Attention (Standards Issues)**, Code Review Axis: Does the code follow documented coding standards and avoid code smells?, ✅ Code Review Conclusion, Code Review: mtkdemandengines (Phase 2) (+11 more)

### Community 19 - ".scrape"
Cohesion: 0.12
Nodes (10): Type text with human-like speed variations., Scrape a page with Camoufox anti-detect browser. Args: url: Target URL…, Search TikTok for marketing-related content. Extracts user profiles and video…, Scrape Facebook Group posts for lead signals. Looks for posts mentioning…, Scrape multiple URLs with fingerprint rotation between each. Each URL gets a…, Scrape with persistent session — login once, then scrape multiple pages. Useful…, Lazy-init Camoufox browser with fingerprint., Close browser and cleanup. (+2 more)

### Community 20 - "CrawlOrchestrator"
Cohesion: 0.10
Nodes (16): Return all enabled sources., Filter sources by engine type., CrawlOrchestrator, main(), Cập nhật circuit breaker + baseline sau mỗi run. Circuit: quan tâm "có fetch…, Run all enabled spiders. engines: filter by engine type ["scrapling_fast",…, Run only social media spiders (TikTok + Facebook). These need Camoufox and are…, Check all systems are operational. (+8 more)

### Community 21 - "BaseSpider"
Cohesion: 0.09
Nodes (18): ABC, CamoufoxEngine, Camoufox Engine — Anti-detect browser for social media crawling.…, Anti-detect browser engine using Camoufox. Designed for platforms with heavy…, Engines package — Scrapling + Camoufox hybrid., Scrapling Engine — Fast + Stealth crawling via Scrapling framework.…, BaseSpider, Base Spider — Abstract base for all crawl spiders.… (+10 more)

### Community 22 - "MTK Demand Engines — Crawl Agent"
Cohesion: 0.11
Nodes (17): 1. Install dependencies, 2. Configure, 3. Run, Adding New Sources, Architecture, Data Flow, Engine Selection Logic, File Structure (+9 more)

### Community 23 - "Hướng dẫn deploy Demand Engine"
Cohesion: 0.11
Nodes (17): A. Deploy bằng wrangler CLI — nhanh nhất, B1. Tạo API token, B2. Lấy Account ID, B3. Nạp secret vào repo, B4. Push, B. GitHub Actions — push là tự deploy, C. Deploy bằng dashboard (không cần terminal), Chọn 1 trong 3 cách (+9 more)

### Community 24 - "cao-tu-dong.mjs"
Cohesion: 0.22
Nodes (13): chayMotNguon(), chonNguon, config, dryRun, guiWorker(), bocLinkBai(), DOAN_DIEU_HUONG, doanDuongDan() (+5 more)

### Community 25 - "Design System Master File"
Cohesion: 0.12
Nodes (16): Additional Forbidden Patterns, Anti-Patterns (Do NOT Use), Buttons, Cards, Color Palette, Component Specs, Design System Master File, Global Rules (+8 more)

### Community 26 - "test_resilience.py"
Cohesion: 0.07
Nodes (27): Unit Tests — Baseline reconciliation + Circuit breaker…, Đối chiếu kết quả run với baseline — reconciliation, không assertion., Source chưa từng ra dữ liệu thì không thể nói là 'hỏng'., Baseline dưới ngưỡng MIN_GOOD_LINKS → chưa đủ bằng chứng., TestBaselineEvaluate, TestBaselineUpdate, TestCircuitBreaker, evaluate_run() (+19 more)

### Community 27 - "Hướng dẫn Submit Leads về Workers"
Cohesion: 0.13
Nodes (14): Bước 1: Lấy DEMAND_TOKEN, Bước 2: Submit Leads, Bước 3: Kiểm tra kết quả, Cách 1: Dùng script (recommended), Cách 2: Dùng curl, Hướng dẫn Submit Leads về Workers, Kết quả hiện tại, Next Steps (+6 more)

### Community 28 - "is_lead_signal"
Cohesion: 0.14
Nodes (9): is_lead_signal(), Check if text contains signals of a job opportunity., Test lead signal keyword detection in forum posts., VN lead signals should be detected., EN lead signals should be detected., Non-lead posts should NOT be detected as leads., Detection should be case-insensitive., Empty or very short text should not trigger. (+1 more)

### Community 29 - "🚀 Deploy Status"
Cohesion: 0.15
Nodes (12): 2026-08-13 — Filtering fix, 2026-08-13 — Pipeline hoạt động端到端, 🔧 API Endpoints, ✅ Deploy Checklist, 📝 Deploy Log, 🚀 Deploy Status, Production Info, Protected (cần `X-Demand-Token`) (+4 more)

### Community 30 - "2. Bộ test và thứ chúng bảo vệ"
Cohesion: 0.15
Nodes (12): 1. Ba tầng kiểm thử, 2. Bộ test và thứ chúng bảo vệ, 3. Smoke test hệ thống, 4. Evaluations cho MCP server, 5. Quy tắc khi thêm code, Chiến lược kiểm thử, `tests/boc-link.test.js` — 14 test, `tests/chuanhoa.test.js` — 6 test (+4 more)

### Community 31 - "crawl_multi_source.py"
Cohesion: 0.18
Nodes (11): crawl_source(), extract_freelancer_jobs(), extract_guru_jobs(), extract_peopleperhour_jobs(), extract_upwork_jobs(), main(), Extract jobs từ Upwork., Extract jobs từ Guru.com. (+3 more)

### Community 32 - "Hướng dẫn Quét & Nạp Lead"
Cohesion: 0.17
Nodes (11): API Endpoints, Cron tự động, Cấu hình nguồn mới, Giao diện, Hướng dẫn Quét & Nạp Lead, Luồng dữ liệu, Protected (cần X-Demand-Token), Public (không cần auth) (+3 more)

### Community 33 - "📋 Tóm Tắt Tình Hình — 2026-08-13"
Cohesion: 0.17
Nodes (11): API Endpoints, Bug fixes (session 2026-08-13), ⏳ Chưa Hoàn Thành, 📁 Cấu trúc code, Giao diện, 🏗️ Kiến trúc, Pipeline hoạt động端到端, Rubric chấm điểm (100 điểm) (+3 more)

### Community 34 - "Kiến trúc kỹ thuật — Demand Engine"
Cohesion: 0.18
Nodes (10): 1. Sơ đồ tổng, 2.1. Tách transport khỏi adapter, 2.2. Dùng markdown thay vì CSS selector, 2.3. Suy luận khuôn đường dẫn thay vì regex khai trước, 2. Ba quyết định kiến trúc và lý do, 3. Rubric 100 điểm — vì sao trọng số như vậy, 4. Ranh giới không được vượt, 5. Bản đồ file (+2 more)

### Community 35 - "WorkersClient"
Cohesion: 0.11
Nodes (12): AsyncClient, FacebookGroupSpider, Spider for Facebook Groups — finds marketing job posts. Uses Camoufox with…, Parse FB Group posts — already JSON from JS extraction., Parse FB post detail., Crawl multiple Facebook Groups for lead signals. Uses Camoufox with session…, Trigger a scan via Workers API (uses existing queue system)., Get status of all configured sources. (+4 more)

### Community 37 - "README.md"
Cohesion: 0.20
Nodes (9): 🐛 Bugs đã fix (session 2026-08-13), 📁 Cấu trúc project, 🚀 Deploy Status, 📝 Documentation, 📄 License, 📈 Next Steps, 🔑 Secrets, 🕷️ Sources đã cấu hình (+1 more)

### Community 38 - "Luồng tự động (pipeline):"
Cohesion: 0.22
Nodes (8): 1. Kiểm tra cấu hình hiện tại, 2. Áp migrations database (theo thứ tự bắt buộc), 3. Kiểm tra hàm RPC `merge_demand_inbox()`, 4. Kiểm tra transport, 5. Cập nhật frontend config, 6. Test kết nối live site, 7. Báo cáo kết quả, Luồng tự động (pipeline):

### Community 39 - "📊 Project Status"
Cohesion: 0.22
Nodes (8): 🏗️ Architecture, 📞 Contact, 🎯 Current State, ⚠️ Known Limitations, 📊 Metrics, 📋 Pending Tasks, 📊 Project Status, ✅ What Works

### Community 40 - "build_preference_prompt"
Cohesion: 0.09
Nodes (26): classify_batch(), classify_jobs_fast(), classify_rule_based(), _llm_confidence(), main(), Fallback: Rule-based classification., Classify all jobs using batch processing., Confidence trung thực: derive từ score, không hardcode. Score càng cực đoan… (+18 more)

### Community 41 - "ScraplingEngine"
Cohesion: 0.19
Nodes (7): Fetch multiple URLs with concurrency limit and delay between batches., Fetch and extract specific data using CSS selectors. selectors: {"title":…, Dual-mode Scrapling engine: - fast mode: FetcherSession with browser…, Fast fetch — impersonate Chrome/Firefox TLS fingerprint. Good for: forums, job…, Stealth fetch — full browser with Cloudflare bypass. Good for: vLance, sites…, Smart fetch — try fast first, escalate to stealth if needed. engine: "fast" |…, ScraplingEngine

### Community 42 - "Cấu hình & secret — Demand Engine"
Cohesion: 0.29
Nodes (6): 1. Project Supabase (ĐÃ ĐỔI — 11/08/2026), 2. Secret đã nạp lên Cloudflare Worker `mtkdemandengines`, 3. 🔒 CẢNH BÁO BẢO MẬT — nên đổi key ngay, 4. Cách nạp lại một secret, 5. Cách kiểm tra hệ thống sau khi nạp secret, Cấu hình & secret — Demand Engine

### Community 43 - "demand-engine-mcp-server"
Cohesion: 0.29
Nodes (6): Cài vào Claude Desktop / Cowork, Cố ý KHÔNG có công cụ đổi trạng thái lead, demand-engine-mcp-server, Sáu công cụ, Test, Ví dụ

### Community 44 - "scrape-vlance.js"
Cohesion: 0.43
Nodes (6): CONFIG, main(), pushToInbox(), sb, scrapeJobPage(), scrapeListPage()

### Community 45 - "📊 TRẠNG THÁI HIỆN TẠI"
Cohesion: 0.29
Nodes (7): 📋 API Endpoints, 📦 Cấu hình nguồn, 🖥️ Giao diện, 🧪 Kết quả quét, ✅ Live site hoạt động hoàn chỉnh, 🔑 Secrets đã cấu hình, 📊 TRẠNG THÁI HIỆN TẠI

### Community 46 - "orchestrator.py"
Cohesion: 0.14
Nodes (7): Crawl Agent Configuration ========================= Central configuration for…, Crawl Agent Orchestrator — Coordinates all spiders and engines.…, BehanceVNSpider, Spider for Truelancer Vietnam — Has Digital Marketing & Video Production jobs…, Spider for Behance Vietnam — Portfolio-based hiring for brand designers in VN., TruelancerVNSpider, Workers API Client — Send crawled leads to MTK Demand Engines.…

### Community 47 - "test_stealth.py"
Cohesion: 0.47
Nodes (5): main(), Test vLance.vn với Scrapling Stealth., Test BlackHatWorld với Scrapling Stealth., test_blackhatworld(), test_vlance()

### Community 48 - "Page Override — app.html (dashboard duyệt lead)"
Cohesion: 0.33
Nodes (5): Màu — ELECTRIC BLUE (không dùng palette violet của MASTER), Page Override — app.html (dashboard duyệt lead), Style, Typography, UX bắt buộc

### Community 49 - "auto-scrape-flow.js"
Cohesion: 0.47
Nodes (5): main(), sb, scrapeSource(), SOURCE_CONFIG, updateSourceStats()

### Community 50 - "Session State - mtkdemandengines Project"
Cohesion: 0.33
Nodes (5): 🐛 BUGS FIXED TRONG SESSION NÀY, 🔒 BẢO MẬT, 📋 PENDING TASKS, Session State - mtkdemandengines Project, 🧪 TESTS

### Community 51 - "crawl-agent.js"
Cohesion: 0.60
Nodes (5): handleCrawlAgent(), handleCrawlSources(), handleCrawlStatus(), handleSubmitCrawl(), handleTriggerCrawl()

### Community 52 - "analyze_url"
Cohesion: 0.50
Nodes (4): analyze_url(), main(), Analyze all target sites., Fetch URL and analyze HTML structure.

### Community 53 - "🔧 Setup & Development"
Cohesion: 0.40
Nodes (5): Deploy, Install, Local development, Prerequisites, 🔧 Setup & Development

### Community 54 - "TikTokSpider"
Cohesion: 0.25
Nodes (5): Crawl TikTok by searching multiple queries. Each query gets a separate search…, Spider for TikTok — searches for marketing-related content. Uses Camoufox with…, Parse TikTok search results — already JSON from JS extraction., Parse TikTok profile/page detail., TikTokSpider

### Community 58 - "submit_leads"
Cohesion: 0.67
Nodes (3): main(), Submit leads từ file JSON về Workers API., submit_leads()

### Community 59 - "test_curl_cffi"
Cohesion: 0.67
Nodes (3): main(), Test URL với curl_cffi trực tiếp., test_curl_cffi()

### Community 60 - "test_dynamic"
Cohesion: 0.67
Nodes (3): main(), Test URL with Scrapling DynamicFetcher (JS rendering)., test_dynamic()

### Community 61 - "test_fetcher"
Cohesion: 0.67
Nodes (3): main(), Test URL with Scrapling Fetcher (fast mode)., test_fetcher()

### Community 62 - "test_architecture_review.py"
Cohesion: 0.50
Nodes (3): calculate_overall_fit(), Architecture Review — Doubt-Driven Adversarial Analysis…, Calculate overall % fit with Christian's requirements.

### Community 63 - "Page Override — index.html (landing marketing)"
Cohesion: 0.50
Nodes (3): Cấu trúc — Minimal Single Column, Page Override — index.html (landing marketing), Quy tắc cứng

### Community 64 - "🛠️ API Endpoints"
Cohesion: 0.50
Nodes (4): 🛠️ API Endpoints, Protected (cần `X-Demand-Token`), Public (không cần auth), Ví dụ sử dụng

### Community 65 - "📊 Lead Scoring"
Cohesion: 0.50
Nodes (4): Filtering Logic (2 lớp), 📊 Lead Scoring, Rubric (0-100 điểm), Tier classification

### Community 66 - "📊 Kết quả thực tế"
Cohesion: 0.50
Nodes (4): 📊 Kết quả thực tế, Leads đã thu thập, Pipeline hoạt động, Ví dụ leads (SAU KHI FIX)

### Community 68 - "🧪 Tests"
Cohesion: 0.67
Nodes (3): Chạy tests, Test coverage, 🧪 Tests

### Community 69 - "📋 Tổng quan"
Cohesion: 0.67
Nodes (3): Luồng dữ liệu (ĐÃ HOẠT ĐỘNG), Nguyên tắc hoạt động, 📋 Tổng quan

## Knowledge Gaps
- **415 isolated node(s):** `$schema`, `username`, `default_agent`, `logLevel`, `autoupdate` (+410 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Config` connect `Config` to `WorkersClient`, `build_preference_prompt`, `orchestrator.py`, `CrawlOrchestrator`, `BaseSpider`, `is_lead_signal`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `BaseSpider` connect `BaseSpider` to `forum.py`, `WorkersClient`, `Config`, `spiders/__init__.py`, `ScraplingEngine`, `orchestrator.py`, `JobBoardVNSpider`, `UpworkVNSpider`, `TikTokSpider`, `FreelancerComVNSpider`, `PeoplePerHourSpider`, `Job123Spider`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `CamoufoxEngine` connect `BaseSpider` to `WorkersClient`, `orchestrator.py`, `.scrape`, `CrawlOrchestrator`, `TikTokSpider`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Are the 27 inferred relationships involving `BaseSpider` (e.g. with `Config` and `CamoufoxEngine`) actually correct?**
  _`BaseSpider` has 27 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `CamoufoxEngine` (e.g. with `CrawlOrchestrator` and `BaseSpider`) actually correct?**
  _`CamoufoxEngine` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `WorkersClient` (e.g. with `CrawlOrchestrator` and `BaseSpider`) actually correct?**
  _`WorkersClient` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `Config` (e.g. with `CrawlOrchestrator` and `BaseSpider`) actually correct?**
  _`Config` has 8 INFERRED edges - model-reasoned connections that need verification._