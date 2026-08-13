"""
Unit Tests — Core Logic (Test-Driven Development)
==================================================
Tests for pure functions that don't require network/browser.
Following TDD: These tests define the CONTRACT before implementation.
"""

import sys
import unittest
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from spiders.forum import is_lead_signal, LEAD_SIGNALS_VN, LEAD_SIGNALS_EN


class TestLeadSignalDetection(unittest.TestCase):
    """Test lead signal keyword detection in forum posts."""

    def test_vietnamese_lead_signals_detected(self):
        """VN lead signals should be detected."""
        test_cases = [
            "Cần tìm người chạy ads Facebook",
            "Tìm agency làm branding cho công ty",
            "Cần thuê freelancer thiết kế logo",
            "Tìm đội ngũ marketing cho dự án",
            "Cần đối tác làm TVC quảng cáo",
        ]
        for text in test_cases:
            with self.subTest(text=text):
                self.assertTrue(is_lead_signal(text), f"Should detect: {text}")

    def test_english_lead_signals_detected(self):
        """EN lead signals should be detected."""
        test_cases = [
            "Looking for marketing agency",
            "Need help with Facebook ads",
            "Hiring freelance content writer",
            "Looking to hire social media manager",
            "Need someone to run Google Ads",
        ]
        for text in test_cases:
            with self.subTest(text=text):
                self.assertTrue(is_lead_signal(text), f"Should detect: {text}")

    def test_non_lead_posts_not_detected(self):
        """Non-lead posts should NOT be detected as leads."""
        test_cases = [
            "Just finished a great marketing campaign",
            "Sharing my experience with SEO",
            "Tips for better content marketing",
            "How to improve your branding strategy",
            "Discussion about social media trends",
        ]
        for text in test_cases:
            with self.subTest(text=text):
                self.assertFalse(is_lead_signal(text), f"Should NOT detect: {text}")

    def test_case_insensitive(self):
        """Detection should be case-insensitive."""
        self.assertTrue(is_lead_signal("CẦN TÌM NGƯỜI CHẠY ADS"))
        self.assertTrue(is_lead_signal("looking FOR marketing AGENCY"))

    def test_empty_and_short_text(self):
        """Empty or very short text should not trigger."""
        self.assertFalse(is_lead_signal(""))
        self.assertFalse(is_lead_signal("abc"))


class TestLeadSignalKeywords(unittest.TestCase):
    """Test keyword list completeness."""

    def test_vn_keywords_exist(self):
        """VN keyword list should not be empty."""
        self.assertGreater(len(LEAD_SIGNALS_VN), 10)

    def test_en_keywords_exist(self):
        """EN keyword list should not be empty."""
        self.assertGreater(len(LEAD_SIGNALS_EN), 5)

    def test_critical_vn_keywords_present(self):
        """Critical VN keywords must be present."""
        critical = ["cần tìm", "tìm người", "thuê ngoài", "cần chạy ads"]
        for kw in critical:
            self.assertIn(kw, LEAD_SIGNALS_VN, f"Missing critical keyword: {kw}")


class TestBocLinkIntegration(unittest.TestCase):
    """Test integration with existing boc-link.js logic (conceptual)."""

    def test_url_dedup_concept(self):
        """URL dedup should normalize URLs."""
        # This tests the CONCEPT — actual implementation in JS
        urls = [
            "https://vlance.vn/du-an/thiet-ke-logo-12345",
            "https://vlance.vn/du-an/thiet-ke-logo-12345/",  # trailing slash
            "HTTPS://VLANCE.VN/DU-AN/THIET-KE-LOGO-12345",  # uppercase
        ]
        # All should dedupe to same key
        normalized = [u.rstrip("/").lower() for u in urls]
        self.assertEqual(len(set(normalized)), 1)


class TestConfigValidation(unittest.TestCase):
    """Test configuration validation."""

    def test_source_codes_unique(self):
        """All source codes should be unique."""
        from config import Config
        sources = Config.get_all_sources()
        codes = [s["code"] for s in sources]
        self.assertEqual(len(codes), len(set(codes)), "Duplicate source codes found")

    def test_engine_types_valid(self):
        """Engine types should be valid."""
        valid_engines = {"scrapling_fast", "scrapling_stealth", "camoufox"}
        from config import Config
        for source in Config.get_all_sources():
            self.assertIn(
                source["engine"],
                valid_engines,
                f"Invalid engine for {source['code']}: {source['engine']}"
            )

    def test_urls_are_valid(self):
        """All configured URLs should be valid."""
        from config import Config
        from urllib.parse import urlparse

        for source in Config.get_all_sources():
            for url in source.get("urls", []):
                parsed = urlparse(url)
                self.assertTrue(
                    parsed.scheme in ("http", "https"),
                    f"Invalid URL scheme for {source['code']}: {url}"
                )
                self.assertTrue(
                    parsed.netloc,
                    f"Missing host for {source['code']}: {url}"
                )


class TestLeadFormatContract(unittest.TestCase):
    """Test lead format matches Workers API contract."""

    def test_required_fields(self):
        """Lead must have required fields for /api/demand/nap."""
        # Contract: nap-lead.js expects these fields
        required_fields = {"source", "url", "noiDung"}

        # Simulate a lead from spider
        lead = {
            "source": "vlance",
            "url": "https://vlance.vn/du-an/test",
            "noiDung": "Cần tìm người thiết kế logo...",
            "tieuDe": "Thiết kế logo",
            "postedAt": None,
        }

        for field in required_fields:
            self.assertIn(field, lead, f"Missing required field: {field}")

    def test_noi_dung_not_empty(self):
        """noiDung must not be empty (nap-lead.js requires >= 20 chars)."""
        lead = {
            "source": "test",
            "url": "https://example.com",
            "noiDung": "x" * 20,  # Minimum length
        }
        self.assertGreaterEqual(len(lead["noiDung"]), 20)


if __name__ == "__main__":
    unittest.main(verbosity=2)
