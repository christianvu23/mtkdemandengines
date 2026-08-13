"""
Unit Tests — URL guard (SSRF allowlist + robots.txt)
=====================================================
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.url_guard import is_safe_url, parse_robots, path_allowed


class TestIsSafeUrl(unittest.TestCase):
    def test_normal_https_url_ok(self):
        ok, why = is_safe_url("https://vlance.vn/viec-lam/marketing")
        self.assertTrue(ok, why)

    def test_blocks_localhost(self):
        ok, _ = is_safe_url("http://localhost:8787/api/secret")
        self.assertFalse(ok)

    def test_blocks_private_ip(self):
        ok, _ = is_safe_url("http://192.168.1.1/admin")
        self.assertFalse(ok)

    def test_blocks_cloud_metadata(self):
        """169.254.169.254 = cloud metadata endpoint — SSRF kinh điển."""
        ok, _ = is_safe_url("http://169.254.169.254/latest/meta-data/")
        self.assertFalse(ok)

    def test_blocks_loopback_ip(self):
        ok, _ = is_safe_url("http://127.0.0.1/")
        self.assertFalse(ok)

    def test_blocks_file_scheme(self):
        ok, _ = is_safe_url("file:///C:/Users/admin/.env.local")
        self.assertFalse(ok)

    def test_blocks_internal_hostnames(self):
        ok, _ = is_safe_url("http://db.internal:5432/")
        self.assertFalse(ok)

    def test_blocks_garbage(self):
        ok, _ = is_safe_url("not a url at all")
        self.assertFalse(ok)
        ok, _ = is_safe_url("")
        self.assertFalse(ok)


class TestParseRobots(unittest.TestCase):
    ROBOTS = """
User-agent: *
Disallow: /private/
Disallow: /tmp

User-agent: MTKCrawlBot
Disallow: /no-bot/
"""

    def test_wildcard_agent_gets_star_rules(self):
        disallowed = parse_robots(self.ROBOTS, user_agent="*")
        self.assertIn("/private/", disallowed)
        self.assertIn("/tmp", disallowed)
        self.assertNotIn("/no-bot/", disallowed)

    def test_specific_agent_gets_own_rules(self):
        disallowed = parse_robots(self.ROBOTS, user_agent="MTKCrawlBot")
        self.assertIn("/no-bot/", disallowed)
        self.assertNotIn("/private/", disallowed)

    def test_empty_disallow_allows_all(self):
        robots = "User-agent: *\nDisallow:\n"
        self.assertEqual(parse_robots(robots), [])

    def test_empty_or_missing_robots(self):
        self.assertEqual(parse_robots(""), [])
        self.assertEqual(parse_robots(None), [])

    def test_comments_ignored(self):
        robots = "User-agent: *  # bot\nDisallow: /x  # lý do\n"
        self.assertEqual(parse_robots(robots), ["/x"])


class TestPathAllowed(unittest.TestCase):
    def test_no_rules_allows_everything(self):
        self.assertTrue(path_allowed("/bat-ky", []))

    def test_prefix_blocked(self):
        self.assertFalse(path_allowed("/private/page", ["/private/"]))

    def test_unrelated_path_allowed(self):
        self.assertTrue(path_allowed("/public/page", ["/private/"]))

    def test_multiple_rules(self):
        rules = ["/a/", "/b/"]
        self.assertFalse(path_allowed("/a/x", rules))
        self.assertFalse(path_allowed("/b/x", rules))
        self.assertTrue(path_allowed("/c/x", rules))


if __name__ == "__main__":
    unittest.main()
