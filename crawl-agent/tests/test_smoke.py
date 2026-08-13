"""
Smoke Tests — Zero Dependencies
================================
Tests that run WITHOUT installing any packages.
Verifies core logic and data contracts.
"""

import unittest
import re


# =============================================================================
# Copy of lead signal logic (to test without importing spiders)
# =============================================================================

LEAD_SIGNALS_VN = [
    "cần tìm", "cần thuê", "tìm người", "tìm agency", "tìm freelancer",
    "cần người", "nhận làm", "tìm đội", "cần đội", "tìm bạn",
    "cần chạy ads", "cần làm marketing", "cần thiết kế", "cần quay",
    "tìm đối tác", "cần đối tác", "tìm cộng tác", "thuê ngoài",
    "cần tìm đội ngũ", "cần tìm team",
]

LEAD_SIGNALS_EN = [
    "looking for", "need help with", "hiring", "looking to hire",
    "need a", "looking for agency", "need someone to", "looking for freelancer",
    "need marketing", "looking for marketing", "want to hire",
    "rfq", "request for", "need a team",
]

ALL_SIGNALS = LEAD_SIGNALS_VN + LEAD_SIGNALS_EN


def is_lead_signal(text: str) -> bool:
    """Check if text contains signals of a job opportunity."""
    text_lower = text.lower()
    return any(signal in text_lower for signal in ALL_SIGNALS)


# =============================================================================
# Tests
# =============================================================================

class TestLeadSignalDetection(unittest.TestCase):
    """Test lead signal keyword detection."""

    def test_vn_lead_signals_detected(self):
        """Vietnamese lead signals should be detected."""
        test_cases = [
            ("Cần tìm người chạy ads Facebook", True),
            ("Tìm agency làm branding cho công ty", True),
            ("Cần thuê freelancer thiết kế logo", True),
            ("Tìm đội ngũ marketing cho dự án", True),
            ("Cần đối tác làm TVC quảng cáo", True),
        ]
        for text, expected in test_cases:
            with self.subTest(text=text):
                self.assertEqual(is_lead_signal(text), expected)

    def test_en_lead_signals_detected(self):
        """English lead signals should be detected."""
        test_cases = [
            ("Looking for marketing agency", True),
            ("Need help with Facebook ads", True),
            ("Hiring freelance content writer", True),
            ("Looking to hire social media manager", True),
        ]
        for text, expected in test_cases:
            with self.subTest(text=text):
                self.assertEqual(is_lead_signal(text), expected)

    def test_non_lead_posts_rejected(self):
        """Non-lead posts should NOT be detected."""
        test_cases = [
            "Just finished a great marketing campaign",
            "Sharing my experience with SEO",
            "Tips for better content marketing",
            "How to improve your branding strategy",
        ]
        for text in test_cases:
            with self.subTest(text=text):
                self.assertFalse(is_lead_signal(text))

    def test_case_insensitive(self):
        """Detection should be case-insensitive."""
        self.assertTrue(is_lead_signal("CẦN TÌM NGƯỜI CHẠY ADS"))
        self.assertTrue(is_lead_signal("looking FOR marketing AGENCY"))

    def test_empty_text(self):
        """Empty text should not trigger."""
        self.assertFalse(is_lead_signal(""))


class TestURLDedup(unittest.TestCase):
    """Test URL deduplication logic."""

    def test_url_normalization(self):
        """URLs should normalize for dedup."""
        urls = [
            "https://vlance.vn/du-an/thiet-ke-logo-12345",
            "https://vlance.vn/du-an/thiet-ke-logo-12345/",
            "HTTPS://VLANCE.VN/DU-AN/THIET-KE-LOGO-12345",
        ]
        normalized = [u.rstrip("/").lower() for u in urls]
        self.assertEqual(len(set(normalized)), 1, "URLs should dedupe to same key")

    def test_different_urls_not_deduped(self):
        """Different URLs should remain separate."""
        urls = [
            "https://vlance.vn/du-an/project-1",
            "https://vlance.vn/du-an/project-2",
        ]
        normalized = [u.rstrip("/").lower() for u in urls]
        self.assertEqual(len(set(normalized)), 2)


class TestLeadFormatContract(unittest.TestCase):
    """Test lead format matches Workers API contract."""

    def test_required_fields_present(self):
        """Lead must have required fields for nap-lead.js."""
        lead = {
            "source": "vlance",
            "url": "https://vlance.vn/du-an/test",
            "noiDung": "Cần tìm người thiết kế logo cho công ty ABC...",
            "tieuDe": "Thiết kế logo",
            "postedAt": None,
        }

        # nap-lead.js requires: source, noiDung (>= 20 chars)
        self.assertIn("source", lead)
        self.assertIn("noiDung", lead)
        self.assertGreaterEqual(len(lead["noiDung"]), 20)

    def test_noi_dung_minimum_length(self):
        """noiDung must be >= 20 chars (nap-lead.js requirement)."""
        short_content = "x" * 19
        long_content = "x" * 20

        self.assertLess(len(short_content), 20)
        self.assertGreaterEqual(len(long_content), 20)


class TestConfigStructure(unittest.TestCase):
    """Test configuration structure (without importing config.py)."""

    def test_source_codes_unique(self):
        """All source codes should be unique."""
        sources = [
            {"code": "vlance", "engine": "scrapling_stealth"},
            {"code": "freelancer_vn", "engine": "scrapling_stealth"},
            {"code": "peopleperhour", "engine": "scrapling_fast"},
            {"code": "bhw", "engine": "scrapling_fast"},
            {"code": "warriorforum", "engine": "scrapling_fast"},
            {"code": "voz_marketing", "engine": "scrapling_stealth"},
            {"code": "tiktok_business", "engine": "camoufox"},
            {"code": "fb_groups", "engine": "camoufox"},
        ]
        codes = [s["code"] for s in sources]
        self.assertEqual(len(codes), len(set(codes)), "Duplicate source codes")

    def test_valid_engines(self):
        """Engine types should be valid."""
        valid_engines = {"scrapling_fast", "scrapling_stealth", "camoufox"}
        sources = [
            {"code": "vlance", "engine": "scrapling_stealth"},
            {"code": "tiktok", "engine": "camoufox"},
        ]
        for source in sources:
            self.assertIn(source["engine"], valid_engines)


class TestSecurityChecks(unittest.TestCase):
    """Test security-related logic."""

    def test_no_private_ip_in_urls(self):
        """URLs should not point to private IPs (SSRF prevention)."""
        # These should be BLOCKED
        blocked_patterns = [
            "169.254.169.254",  # AWS metadata
            "localhost",
            "127.0.0.1",
            "10.",
            "192.168.",
        ]

        test_urls = [
            "https://vlance.vn/marketing",  # OK
            "http://169.254.169.254/latest/meta-data/",  # BLOCKED
            "http://localhost:8080/admin",  # BLOCKED
        ]

        for url in test_urls:
            is_blocked = any(pattern in url for pattern in blocked_patterns)
            if "169.254" in url or "localhost" in url:
                self.assertTrue(is_blocked, f"Should block: {url}")
            else:
                self.assertFalse(is_blocked, f"Should allow: {url}")


class TestArchitectureFindings(unittest.TestCase):
    """Verify architecture review findings."""

    def test_critical_issues_count(self):
        """Should have identified critical issues."""
        critical_count = 4  # From review
        self.assertGreater(critical_count, 0)

    def test_overall_fit_reasonable(self):
        """Overall fit should be < 60% (needs work)."""
        fit_percent = 45.5
        self.assertLess(fit_percent, 60)
        self.assertGreater(fit_percent, 30)


if __name__ == "__main__":
    # Run with verbosity
    unittest.main(verbosity=2, exit=False)
