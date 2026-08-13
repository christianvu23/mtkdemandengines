"""
Unit Tests — Feedback memory + classify hardening
==================================================
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.feedback import build_preference_prompt, load_feedback
from classify_fast import _llm_confidence, classify_rule_based


class TestPreferencePrompt(unittest.TestCase):
    def test_empty_feedback_returns_empty_prompt(self):
        self.assertEqual(build_preference_prompt({"positive": [], "negative": []}), "")

    def test_positive_examples_included(self):
        fb = {
            "positive": [{"tieu_de": "Cần thuê chạy ads", "nhu_cau": ["ads_facebook"]}],
            "negative": [],
        }
        prompt = build_preference_prompt(fb)
        self.assertIn("ĐÃ CHỌN", prompt)
        self.assertIn("Cần thuê chạy ads", prompt)
        self.assertIn("ads_facebook", prompt)

    def test_negative_examples_included(self):
        fb = {
            "positive": [],
            "negative": [{"tieu_de": "Chào giá rẻ nhất", "nhu_cau": []}],
        }
        prompt = build_preference_prompt(fb)
        self.assertIn("ĐÃ BỎ", prompt)
        self.assertIn("Chào giá rẻ nhất", prompt)

    def test_max_examples_capped(self):
        fb = {"positive": [{"tieu_de": f"Lead {i}", "nhu_cau": []} for i in range(50)], "negative": []}
        prompt = build_preference_prompt(fb, max_examples=5)
        # Chỉ 5 lead cuối được giữ
        self.assertEqual(prompt.count("- Lead"), 5)
        self.assertIn("Lead 49", prompt)
        self.assertNotIn("Lead 1\n", prompt)

    def test_load_feedback_missing_file_returns_empty(self):
        fb = load_feedback(Path(__file__).parent / "khong_ton_tai.json")
        self.assertEqual(fb, {"positive": [], "negative": [], "updated_at": None})


class TestLlmConfidence(unittest.TestCase):
    def test_extreme_scores_high_confidence(self):
        self.assertGreater(_llm_confidence(95), 0.85)
        self.assertGreater(_llm_confidence(5), 0.85)

    def test_mid_score_lowest_confidence(self):
        self.assertAlmostEqual(_llm_confidence(50), 0.5)

    def test_never_fakes_certainty(self):
        """Không bao giờ trả 1.0 — LLM luôn có xác suất sai."""
        for score in range(0, 101):
            self.assertLessEqual(_llm_confidence(score), 0.95)

    def test_rule_based_still_works(self):
        result = classify_rule_based({"title": "I am looking for a marketing agency", "description": ""})
        self.assertEqual(result["category"], "HOT_LEAD")


if __name__ == "__main__":
    unittest.main()
