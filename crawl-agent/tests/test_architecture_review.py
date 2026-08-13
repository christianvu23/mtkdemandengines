"""
Architecture Review — Doubt-Driven Adversarial Analysis
========================================================
Applying Matt's skills: karpathy-guidelines, code-review-and-quality,
doubt-driven-development, security-and-hardening, test-driven-development

FRESH-CONTEXT ADVERSARIAL REVIEW:
"Find what is wrong with this artifact. Assume the author is overconfident.
Look for: Unstated assumptions, Edge cases not handled, Hidden coupling,
Ways the contract could be violated, Failure modes under unexpected input."
"""

# =============================================================================
# CLAIM 1: "The hybrid Scrapling + Camoufox architecture fits the project"
# WHY THIS MATTERS: If the architecture doesn't integrate cleanly with the
# existing Workers pipeline, the agent produces data that can't be scored.
# =============================================================================

REVIEW_FINDINGS = {
    "architecture": {
        "issues": [
            {
                "severity": "CRITICAL",
                "category": "Integration Gap",
                "finding": "Crawl agent posts to /api/crawl/submit but Workers API expects "
                           "X-Demand-Token header. The WorkersClient doesn't handle 401 "
                           "gracefully — it will retry indefinitely on auth failure.",
                "fix": "Add explicit auth check in health_check() before any crawl runs."
            },
            {
                "severity": "REQUIRED",
                "category": "Data Contract Mismatch",
                "finding": "Spider format_lead() produces {noiDung, tieuDe} but nap-lead.js "
                           "expects {noiDung, tieuDe, postedAt, sourceQuery}. The social.py "
                           "spiders don't consistently populate postedAt.",
                "fix": "Standardize lead format across all spiders. Add postedAt fallback."
            },
            {
                "severity": "REQUIRED",
                "category": "Over-engineering (Karpathy)",
                "finding": "BaseSpider has 210 lines with abstract methods that 80% of spiders "
                           "don't need. The crawl() method is 100+ lines doing listing→detail "
                           "but social spiders override this entirely with crawl_search_queries().",
                "fix": "Split into SimpleSpider (listing→detail) and SearchSpider (query→results). "
                       "Social spiders inherit SearchSpider, not BaseSpider."
            },
            {
                "severity": "OPTIONAL",
                "category": "Missing Error Recovery",
                "finding": "No circuit breaker for repeated failures. If vLance blocks all "
                           "requests for 1 hour, the agent keeps retrying every 6 hours.",
                "fix": "Add exponential backoff per source. Store last_error + retry_after in KV."
            },
        ],
        "score": "65/100",
        "verdict": "Architecture works but has integration gaps that will cause silent failures."
    },

    # =========================================================================
    # CLAIM 2: "Camoufox will bypass TikTok/Facebook bot detection"
    # WHY THIS MATTERS: If Camoufox gets blocked, the social media lead
    # source (which Christian specifically requested) produces nothing.
    # =========================================================================

    "camoufox_effectiveness": {
        "issues": [
            {
                "severity": "CRITICAL",
                "category": "Unverified Assumption",
                "finding": "No proof that Camoufox bypasses TikTok's bot detection. "
                           "TikTok uses behavioral analysis (scroll patterns, mouse movement) "
                           "that Camoufox's 'human-like' simulation may not match. "
                           "The _human_scroll() uses random.randint() — TikTok's ML can detect "
                           "this as non-human (real humans have acceleration curves).",
                "fix": "Add real-behavior simulation: Bezier curve mouse movement, "
                       "variable scroll velocity with momentum. Test against TikTok's "
                       "actual detection before claiming it works."
            },
            {
                "severity": "REQUIRED",
                "category": "Login Wall",
                "finding": "Facebook Groups require login to see content. The scrape_with_session() "
                           "method exists but requires credentials. No credential management, "
                           "no 2FA handling, no session persistence.",
                "fix": "Document that FB Groups need manual login cookie injection. "
                       "Add cookie_file parameter to CamoufoxEngine."
            },
            {
                "severity": "REQUIRED",
                "category": "Resource Exhaustion",
                "finding": "Camoufox runs a full Firefox instance. With 5 concurrent social "
                           "spiders, that's 5 Firefox processes × 500MB = 2.5GB RAM. "
                           "No memory limit or process management.",
                "fix": "Add max_instances parameter. Run social spiders sequentially, not parallel."
            },
        ],
        "score": "40/100",
        "verdict": "Camoufox effectiveness is UNVERIFIED. Needs real-world testing against "
                   "TikTok/FB before claiming it works. High risk of producing zero leads."
    },

    # =========================================================================
    # CLAIM 3: "Scrapling spiders will extract leads from freelancer sites"
    # WHY THIS MATTERS: The CSS selectors are guesses — we haven't seen the
    # actual HTML of vLance (it returns 403 to non-browsers).
    # =========================================================================

    "scrapling_selectors": {
        "issues": [
            {
                "severity": "CRITICAL",
                "category": "Selector Guessing (Karpathy: 'Don't assume')",
                "finding": "VLanceSpider.parse_listing() uses selectors like '.project-card, "
                           ".job-card, .listing-item' — these are GUESSES. vLance's actual "
                           "HTML structure is unknown (403 blocked). If selectors don't match, "
                           "the spider returns 0 leads with no error.",
                "fix": "1. Use Scrapling stealth to fetch vLance first. "
                       "2. Log the actual HTML structure. "
                       "3. Update selectors based on real DOM. "
                       "4. Add assertion: if 0 links found after 3 pages, raise alert."
            },
            {
                "severity": "REQUIRED",
                "category": "No Validation",
                "finding": "parse_listing() returns [] silently on parse failure. No way to "
                           "distinguish 'no jobs available' from 'selectors wrong'. "
                           "Christian will think the system works when it's actually broken.",
                "fix": "Return parse_confidence score. If < 0.5, flag for manual review."
            },
            {
                "severity": "REQUIRED",
                "category": "Forum Lead Detection",
                "finding": "is_lead_signal() checks 30 keywords but forums use slang/abbreviations: "
                           "'CM' (content marketing), 'ADS' (advertising), 'TVC' (commercial video). "
                           "Current list misses common abbreviations.",
                "fix": "Add abbreviation mapping: {'cm': 'content marketing', 'ads': 'advertising'}"
            },
        ],
        "score": "50/100",
        "verdict": "Selectors are unverified guesses. System will appear to work but may "
                   "extract 0 leads silently. Needs real HTML inspection."
    },

    # =========================================================================
    # CLAIM 4: "The agent integrates cleanly with existing Workers pipeline"
    # WHY THIS MATTERS: If integration breaks, leads don't get scored.
    # =========================================================================

    "workers_integration": {
        "issues": [
            {
                "severity": "REQUIRED",
                "category": "Missing Test Coverage",
                "finding": "No unit tests for crawl-agent bridge (src/transport/crawl-agent.js). "
                           "handleSubmitCrawl() calls napNhieuLead() but doesn't test edge cases: "
                           "empty leads array, malformed lead, duplicate URL.",
                "fix": "Write tests: test_empty_leads, test_malformed_lead, test_duplicate_url."
            },
            {
                "severity": "REQUIRED",
                "category": "No Idempotency",
                "finding": "If crawl agent submits same lead twice (retry after timeout), "
                           "Workers creates duplicate inbox entries. nap-lead.js has dedup "
                           "but only within a single batch, not across batches.",
                "fix": "Add lead_key to crawl submit payload. Check existing lead_key before insert."
            },
            {
                "severity": "OPTIONAL",
                "category": "Error Visibility",
                "finding": "When crawl submit fails, error goes to console.log only. "
                           "No alert to Christian. Silent failure = lost leads.",
                "fix": "Add Telegram/webhook notification on submit failure."
            },
        ],
        "score": "70/100",
        "verdict": "Integration exists but lacks test coverage and idempotency guarantees."
    },

    # =========================================================================
    # SECURITY REVIEW (security-and-hardening skill)
    # =========================================================================

    "security": {
        "issues": [
            {
                "severity": "CRITICAL",
                "category": "SSRF Risk",
                "finding": "Crawl agent fetches arbitrary URLs from config. If config is "
                           "compromised or user-controlled, agent could fetch internal URLs "
                           "(http://169.254.169.254 for cloud metadata).",
                "fix": "Add URL allowlist. Block private IPs, localhost, cloud metadata endpoints."
            },
            {
                "severity": "REQUIRED",
                "category": "Credential Exposure",
                "finding": "FacebookGroupSpider.scrape_with_session() accepts credentials dict. "
                           "If logged, credentials appear in plaintext in logs.",
                "fix": "Never log credentials. Use credential_file parameter instead of dict."
            },
            {
                "severity": "REQUIRED",
                "category": "Unvalidated External Data",
                "finding": "Spider parse methods extract text from external HTML. This text "
                           "goes into lead payload → Supabase. If HTML contains prompt injection "
                           "(intentional or not), it could affect downstream AI processing.",
                "fix": "Sanitize extracted text: strip scripts, iframes, suspicious patterns."
            },
        ],
        "score": "60/100",
        "verdict": "SSRF risk is critical. Credential handling needs improvement."
    },
}


def calculate_overall_fit() -> dict:
    """Calculate overall % fit with Christian's requirements."""

    requirements = {
        "crawl_freelancer_sites": {
            "weight": 30,
            "score": 50,  # Selectors unverified
            "notes": "Architecture exists but selectors are guesses"
        },
        "crawl_marketing_forums": {
            "weight": 25,
            "score": 55,  # Lead detection needs work
            "notes": "Keyword detection incomplete, needs abbreviation mapping"
        },
        "crawl_tiktok": {
            "weight": 20,
            "score": 30,  # Completely unverified
            "notes": "Camoufox effectiveness unproven against TikTok's ML detection"
        },
        "crawl_facebook": {
            "weight": 15,
            "score": 25,  # Login wall not addressed
            "notes": "FB Groups need login, no session management"
        },
        "integrate_with_workers": {
            "weight": 10,
            "score": 70,  # Bridge exists but untested
            "notes": "API endpoints created, no test coverage"
        },
    }

    weighted_score = sum(r["weight"] * r["score"] / 100 for r in requirements.values())
    overall_fit = weighted_score

    return {
        "overall_fit_percent": round(overall_fit * 100, 1),
        "breakdown": requirements,
        "critical_blockers": [
            "CSS selectors are unverified guesses — may extract 0 leads",
            "Camoufox effectiveness against TikTok/FB is unproven",
            "Facebook login wall not addressed",
            "SSRF vulnerability in URL fetching",
        ],
        "recommendation": "Architecture is 48% fit. Before production use, must: "
                          "1) Test selectors against real HTML, "
                          "2) Verify Camoufox against TikTok, "
                          "3) Add FB session management, "
                          "4) Fix SSRF vulnerability."
    }


if __name__ == "__main__":
    import json
    print("\n" + "="*70)
    print("ARCHITECTURE REVIEW — DOUBT-DRIVEN ADVERSARIAL ANALYSIS")
    print("="*70)

    for category, data in REVIEW_FINDINGS.items():
        print(f"\n{'='*70}")
        print(f"## {category.upper()}")
        print(f"Score: {data['score']}")
        print(f"Verdict: {data['verdict']}")
        print(f"\nIssues ({len(data['issues'])}):")
        for i, issue in enumerate(data["issues"], 1):
            print(f"\n  {i}. [{issue['severity']}] {issue['category']}")
            print(f"     Finding: {issue['finding'][:100]}...")
            print(f"     Fix: {issue['fix'][:100]}...")

    print("\n" + "="*70)
    print("OVERALL FIT ASSESSMENT")
    print("="*70)
    fit = calculate_overall_fit()
    print(f"\nOverall Fit: {fit['overall_fit_percent']}%")
    print(f"\nCritical Blockers:")
    for b in fit["critical_blockers"]:
        print(f"  • {b}")
    print(f"\nRecommendation: {fit['recommendation']}")
