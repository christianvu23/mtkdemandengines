# Implementation Plan: Architecture Evaluation, Code Review & Improvements

## Overview
This plan implements the three recommended skills for evaluating the mtkdemandengines codebase: architecture visualization, code review, and architectural improvements.

---

## 📊 Skill 1: archify — Architecture Diagram Visualization

### Status: ✅ COMPLETED

### What Was Done:
1. Created architecture JSON specification (`mtkdemandengines.architecture.json`) based on codebase analysis
2. Validated the specification against archify schema
3. Rendered interactive HTML diagram

### Deliverable:
- **HTML Diagram**: `C:\Users\admin\.agents\skills\archify\mtkdemandengines-architecture.html`
- **JSON Spec**: `C:\Users\admin\.agents\skills\archify\mtkdemandengines.architecture.json`

### Architecture Diagram Features:
- **11 components** visualized: Sources, Transport, boc-link, Core (8 modules), Router, demand-inbox, demand-leads, Worker, MCP Server, public-ui
- **9 connections** showing data flow: sources→transport→boc-link→core→router→inbox, plus worker/mcp→inbox
- **4 boundary regions**: Cloudflare Workers ecosystem, Database layer (Supabase), RLS Policies, Pure Logic Layer
- **3 info cards** highlighting:
  - Key Features (pure functions, 4 transport adapters, pattern-based extraction, conservation law, TTL/freshness, read-only MCP)
  - Design Principles (machine propose/human execute, conservation law, RLS trigger, point weights, budget only scores, elimination rules)
  - Constraints (Meta ToS violation, sandbox credential gaps, learner data requirement)

### Architecture Insights Visible in Diagram:
- **Pure functions only** in core layer (no I/O, 84/84 tests pass)
- **4 transport adapters** with fallback chain: direct → browser_run → unlocker → nap_tay
- **Conservation law**: router groups always sum = input (enforced by test)
- **TTL/freshness** is core differentiator (25/100 weight in rubric)
- **MCP server** strictly read-only (no status changes, principle "máy đề xuất, người bấm")
- **RLS triggers** protect user-modified columns

### How to Re-run/Update:
```bash
# Validate
node bin/archify.mjs validate architecture mtkdemandengines.architecture.json --json --quality standard --repo-root C:/Users/admin/mtkdemandengines

# Render (updates HTML)
node bin/archify.mjs render architecture mtkdemandengines.architecture.json mtkdemandengines-architecture.html --json --quality standard --repo-root C:/Users/admin/mtkdemandengines
```

### Priority: 🔴 **HIGH** (Completed first as foundation for other skills)
- Provides visual basis for code review discussions
- Helps identify architectural friction points
- Essential before deeper architectural analysis

---

## 🔍 Skill 2: code-review — Two-Axis Code Review

### Status: 📋 PLANNED

### Purpose:
Review code changes against two parallel axes:
- **Standards**: Does code follow repo's coding conventions and avoid code smells?
- **Spec**: Does code faithfully implement originating requirements?

### Plan:
1. **Fixed Point**: Compare changes from initial commit `5dfd3f7` to current `HEAD`
2. **Standards Axis**: 
   - Review against Fowler code smells (Duplicated Code, Feature Envy, Primitive Obsession, etc.)
   - Check repo's documented standards (if any) or baseline smells
   - The core pure functions likely pass; transport/worker layers may have issues
3. **Spec Axis**:
   - Verify all changes align with the demand engine requirements documented in KIEN-TRUC.md and README.md
   - Check for scope creep or missing requirements
   - Especially: transport fallback, TTL logic, rubric weights, router conservation law

### Expected Output:
Two separate reports under `## Standards` and `## Spec` headings:
- **Standards**: List of code smells found, with hunks cited, distinguished from baseline judgements
- **Spec**: Missing requirements, scope creep, incorrect implementations with spec quotes

### Specific Areas to Review in mtkdemandengines:
| Area | Standard Checks | Spec Checks |
|------|----------------|-------------|
| `src/core/*.js` | Pure functions, no I/O, match SQL chuan_hoa | Rubric weights sum=100, conservation law |
| `worker.js` | Queue usage, token auth, no status changes | Read-only principle, merge not called |
| `src/transport/index.js` | Fallback chain order, timeout handling | Transport config in demand_sources |
| `mcp/server.js` | 6 tools, read-only, Zod validation | No status-modifying tools |
| Tests (`tests/**/*.test.js` | 84 tests pass | Coverage of all invariants |

### Priority: 🟡 **MEDIUM** (After architecture visualization)
- Provides concrete code quality analysis
- Informs architectural improvement priorities
- Results feed into improve-codebase-architecture skill

### How to Run (when pi harness available):
```bash
# The code-review skill runs as pi agent skill
# Fixed point: 5dfd3f7 (initial commit)
# Compares: 5dfd3f7...HEAD

# Manual simulation would involve:
1. git diff 5dfd3f7 HEAD > /tmp/mtkdiff.patch
2. Run Standards sub-agent on the diff
3. Run Spec sub-agent (if spec available)
4. Aggregate reports under ## Standards and ## Spec
```

### Integration with Other Skills:
- **Input for improve-codebase-architecture**: Code review findings become "friction points" to deepen
- **Input for archify**: Architecture diagram shows where standards violations concentrate

---

## 🏗️ Skill 3: improve-codebase-architecture — Deep Architectural Improvements

### Status: 📋 PLANNED

### Purpose:
Find and visualize "deepening opportunities" — refactors that turn shallow modules into deep ones (small interface, lots of behavior behind it). Output as visual HTML report.

### Plan:
1. **Scope Analysis**: 
   - Use `codebase-design` vocabulary (module, interface, depth, seam, adapter, leverage, locality)
   - Walk commit history to find hot spots (files appearing in recent commits)
   - Current hotspots from git log: worker.js, mcp/server.js, transport/index.js, core modules

2. **Deepening Candidates** (likely top 3-5):
   | Candidate | Current State | Target State | Benefit |
   |-----------|---------------|--------------|---------|
   | `worker.js` | HTTP + Queue in one file | Split: api/routes, queue/handlers, services/supabase | Locality, testability, no timeout |
   | `src/transport/index.js` | 4 adapters in one file with fallback | Define Transport interface, each adapter implements it | Leverage, swapability |
   | `mcp/server.js` | 6 tools in one stdio server | Split: read-only tools vs ingest (still read-only per principle) | Maintain "machine propose/human execute" |
   | `src/core/nap-lead.js` | Convergence point for all lead napping | Extract `LeadIngester` interface with single method | Testability, clear seam |
   | `src/core/rubric-lead.js` | Rule-based scoring, weights hardcoded | Configurable rubric weights, A/B test harness | Learner-ready for future |

3. **HTML Report Generation**:
   - Use `improve-codebase-architecture` skill's HTML report format
   - Each candidate gets a card with: Files, Problem, Solution, Benefits, Before/After diagram
   - Top recommendation section

### Expected HTML Report Structure:
- **Self-contained HTML** with Tailwind CDN + Mermaid CDN
- **Candidates cards** with before/after diagrams (Mermaid or hand-drawn SVG)
- **Top recommendation** section explaining first tackled candidate
- **Export options**: PNG/SVG/WebP/WebM

### Specific Recommendations for mtkdemandengines:

#### 🥇 **Priority 1: Split worker.js** (HIGHEST impact)
- **Current**: 316 lines, combines HTTP routes + queue handler + Supabase calls
- **Problem**: Worker timeout risk (40 links × browser_run ≈ 30 min), single point of change
- **Solution**: 
  - `api/routes.js` — HTTP endpoint definitions only
  - `queue/handlers.js` — Queue job processing logic
  - `services/supabase.js` — Supabase operations (demand_inbox, demand_leads)
- **Benefits**: 
  - No more timeout issues (queue handles concurrency)
  - Each module testable independently
  - Clear separation of concerns

#### 🥈 **Priority 2: Define Transport interface** (HIGH impact)
- **Current**: 4 adapters in `transport/index.js` with fallback chain, no formal interface
- **Problem**: Adding new transport requires modifying fallback logic; hard to test adapters in isolation
- **Solution**: 
  - Define `Transport` interface with `lay()` method signature
  - Each adapter (truc_tiep, browser_run, unlocker, nap_tay) implements it
  - Config-driven fallback chain in demand_sources table
- **Benefits**: 
  - New transports add without modifying core logic
  - Adapters testable with mock implementations
  - Matches archify visualization's "4 adapters with r fallback chain"

#### 🥉 **Priority 3: Extract LeadIngester interface** (MEDIUM impact)
- **Current**: `nap-lead.js` is convergence point for all lead napping (hand-moded + autop)
- **Problem**: Single point of change; hard to test hand-napped vs auto-napped differences
- **Solution**: 
  - Define `LeadIngester` interface with `napLead()` method
  - Hand-napping implementation vs auto-napping implementation
  - Both feed into same `demand_inbox` via single entry point
- **Benefits**: 
  - Clear separation of hand vs auto processing
  - Easier to A/B test different napping strategies
  - Supports future Learner integration

### Priority Ranking Rationale:
1. **worker.js split** — Most urgent: fixes timeout, enables concurrency, largest locality gain
2. **Transport interface** — Enables future transport additions without core changes
3. **LeadIngester interface** — Prepares for Learner phase, improves test coverage

### How to Run (when pi harness available):
```bash
# The improve-codebase-architecture skill runs and generates HTML report
# It would:
1. Walk git log to find hot spots
2. Apply deletion test to candidates
3. Generate HTML to /tmp/architecture-review-<timestamp>.html
4. Open with xdg-open/open/start based on OS

# Manual simulation steps:
1. Review the 3 candidate descriptions above
2. For each, assess current vs target state
3. Prioritize worker.js split as #1
4. Document case studies for top 3 candidates
```

### Integration with Other Skills:
- **Input from code-review**: Standards/spec violations become "reasons to deepen"
- **Input from archify**: Architecture diagram shows module boundaries and connections
- **Uses codebase-design vocabulary**: Consistent language throughout

### Priority: 🟢 **MEDIUM** (Last, builds on findings from skills 1 & 2)
- Provides concrete refactoring plan
- Visual report helps gain stakeholder approval
- Results can be implemented sprint-by-sprint

---

## 📈 Implementation Roadmap

### Phase 1: Foundation (Completed)
- ✅ Run archify → architecture diagram created and rendered
- ✅ Diagram validates architectural invariants (conservation law, pure functions, etc.)

### Phase 2: Code Quality Analysis
- 🟡 Run code-review → Standards + Spec reports
- 🟡 Analyze findings, prioritize code smells/spec gaps
- 🟡 Feed findings into architectural improvement priorities

### Phase 3: Architectural Improvements
- 🟢 Implement worker.js split (Priority 1)
- 🟢 Define Transport interface (Priority 2)  
- 🟢 Extract LeadIngester interface (Priority 3)
- 🟢 Generate improve-codebase-architecture HTML report
- 🟢 Implement top 1-2 recommendations

### Phase 4: Continuous Evolution
- 📅 Re-run archify after changes to visualize evolution
- 📅 Re-run code-review on new PRs/branches
- 📅 Iterate improvements based on Learner data (when available after 2+ weeks)

---

## 🎯 Success Metrics

### After Skill 1 (archify):
- [x] Architecture diagram validates without errors
- [x] Key invariants visible (conservation law, pure functions, TTL weight)
- [x] Diagram serves as communication tool for team

### After Skill 2 (code-review):
- [ ] Standards report lists < 10 code smells (target: clean code)
- [ ] Spec report identifies 0 missing critical requirements
- [ ] Review findings concrete enough to action

### After Skill 3 (improve-codebase-architecture):
- [ ] Top priority (worker.js split) implemented
- [ ] HTML report shows before/after metrics (tests still 84/84, no timeout)
- [ ] Team adopts shared vocabulary (module/interface/depth/seam/adapter/leverage/locality)
- [ ] Plan for next improvement cycle documented

---

## 🛠️ Next Immediate Steps

1. **Copy architecture diagram** to project for team review:
   ```bash
   copy "C:\Users\admin\.agents\skills\archify\mtkdemandengines-architecture.html" "public/arch-diagram.html"
   ```

2. **Schedule code-review session**:
   - Fixed point: `5dfd3f7` (initial commit) to `HEAD`
   - Review Standards axis first (easier, concrete code smells)
   - Follow with Spec axis (requires spec documentation)

3. **Plan worker.js split**:
   - Draft `api/routes.js` — extract HTTP route handlers
   - Draft `queue/handlers.js` — extract queue processing
   - Draft `services/supabase.js` — extract Supabase calls
   - Update `worker.js` to use new modules

4. **Document decisions**:
   - Record ADRs (Architecture Decision Records) for each split
   - Update `CONTEXT.md` with new vocabulary terms
   - Note any ADRs that constrain future changes

---
*Plan generated based on analysis of mtkdemandengines codebase and available pi skills.*