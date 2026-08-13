"""
Unit Tests — Error envelope (recovery contract)
================================================
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.errors import classify, make_error


class TestClassify(unittest.TestCase):
    def test_403_is_blocked_and_not_retryable(self):
        cls = classify("Fetch failed", status=403)
        self.assertEqual(cls["kind"], "blocked")
        self.assertFalse(cls["retryable"])
        self.assertIn("hammer", cls["hint"].lower())

    def test_429_is_rate_limited_and_retryable(self):
        cls = classify("Too Many Requests", status=429)
        self.assertEqual(cls["kind"], "rate_limited")
        self.assertTrue(cls["retryable"])

    def test_timeout_retryable(self):
        cls = classify("Request timed out after 30s")
        self.assertEqual(cls["kind"], "timeout")
        self.assertTrue(cls["retryable"])

    def test_cloudflare_challenge_is_blocked(self):
        cls = classify("Cloudflare challenge detected")
        self.assertEqual(cls["kind"], "blocked")
        self.assertFalse(cls["retryable"])

    def test_dns_error_retryable(self):
        cls = classify("Name resolution failed")
        self.assertEqual(cls["kind"], "dns_network")
        self.assertTrue(cls["retryable"])

    def test_robots_disallowed_never_retries(self):
        cls = classify("robots_disallowed: https://x.com/a")
        self.assertEqual(cls["kind"], "robots_disallowed")
        self.assertFalse(cls["retryable"])

    def test_unknown_defaults_retryable_with_hint(self):
        cls = classify("some weird error")
        self.assertEqual(cls["kind"], "unknown")
        self.assertTrue(cls["retryable"])
        self.assertTrue(cls["hint"])


class TestMakeError(unittest.TestCase):
    def test_envelope_has_full_contract(self):
        err = make_error("listing", "Request timed out", url="https://x.com/a")
        self.assertEqual(err["phase"], "listing")
        self.assertEqual(err["url"], "https://x.com/a")
        self.assertEqual(err["kind"], "timeout")
        self.assertIn("retryable", err)
        self.assertIn("hint", err)
        self.assertIn("error", err)

    def test_submit_error_uses_status(self):
        err = make_error("submit", "API error", status=429)
        self.assertEqual(err["kind"], "rate_limited")
