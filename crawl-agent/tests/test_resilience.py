"""
Unit Tests — Baseline reconciliation + Circuit breaker
=======================================================
Logic thuần, không network. Hai cơ chế này chặn 2 failure mode khác nhau:
- baseline: spider "chết lặng lẽ" (fetch được nhưng parse ra 0)
- circuit: nguồn chết (fetch không được) bị hammer mỗi 30 phút
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.baseline import evaluate_run, update_baseline, MIN_GOOD_LINKS, ZERO_STREAK_ALERT
from utils.circuit_breaker import is_open, record_run, DEFAULT_MAX_FAILURES


class TestBaselineEvaluate(unittest.TestCase):
    """Đối chiếu kết quả run với baseline — reconciliation, không assertion."""

    def test_first_run_records_baseline(self):
        verdict = evaluate_run({"links_found": 7}, None)
        self.assertEqual(verdict["status"], "first_run")
        self.assertEqual(verdict["new_entry"]["last_good_links"], 7)

    def test_healthy_run_resets_streak(self):
        entry = {"last_good_links": 5, "zero_streak": 1, "last_run_at": "x"}
        verdict = evaluate_run({"links_found": 3}, entry)
        self.assertEqual(verdict["status"], "ok")
        self.assertEqual(verdict["new_entry"]["zero_streak"], 0)
        self.assertEqual(verdict["new_entry"]["last_good_links"], 3)

    def test_zero_run_after_good_baseline_watches_first(self):
        entry = {"last_good_links": 10, "zero_streak": 0, "last_run_at": "x"}
        verdict = evaluate_run({"links_found": 0}, entry)
        # Run 0 đầu tiên: chưa kết luận được, chỉ theo dõi
        self.assertEqual(verdict["status"], "watch")
        self.assertEqual(verdict["new_entry"]["zero_streak"], 1)
        # Baseline cũ phải được GIỮ LẠI để lần sau còn đối chiếu
        self.assertEqual(verdict["new_entry"]["last_good_links"], 10)

    def test_consecutive_zero_runs_flag_degraded(self):
        entry = {"last_good_links": 10, "zero_streak": ZERO_STREAK_ALERT - 1, "last_run_at": "x"}
        verdict = evaluate_run({"links_found": 0}, entry)
        self.assertEqual(verdict["status"], "degraded")

    def test_zero_run_without_baseline_never_degraded(self):
        """Source chưa từng ra dữ liệu thì không thể nói là 'hỏng'."""
        entry = {"last_good_links": 0, "zero_streak": 5, "last_run_at": "x"}
        verdict = evaluate_run({"links_found": 0}, entry)
        self.assertNotEqual(verdict["status"], "degraded")

    def test_small_baseline_not_degraded(self):
        """Baseline dưới ngưỡng MIN_GOOD_LINKS → chưa đủ bằng chứng."""
        entry = {"last_good_links": MIN_GOOD_LINKS - 1, "zero_streak": 5, "last_run_at": "x"}
        verdict = evaluate_run({"links_found": 0}, entry)
        self.assertNotEqual(verdict["status"], "degraded")


class TestBaselineUpdate(unittest.TestCase):
    def test_update_is_immutable(self):
        old = {"vlance": {"last_good_links": 5, "zero_streak": 0, "last_run_at": "x"}}
        snapshot = {k: dict(v) for k, v in old.items()}
        new, _ = update_baseline(old, "vlance", {"links_found": 8})
        # Dict cũ không bị sửa (immutable pattern)
        self.assertEqual(old, snapshot)
        self.assertEqual(new["vlance"]["last_good_links"], 8)


class TestCircuitBreaker(unittest.TestCase):
    def test_closed_by_default(self):
        self.assertFalse(is_open({}, "vlance"))

    def test_opens_after_max_failures(self):
        state = {}
        for _ in range(DEFAULT_MAX_FAILURES):
            state = record_run(state, "vlance", ok=False)
        self.assertTrue(is_open(state, "vlance"))

    def test_success_resets_failures(self):
        state = record_run({}, "vlance", ok=False)
        state = record_run(state, "vlance", ok=False)
        state = record_run(state, "vlance", ok=True)
        self.assertFalse(is_open(state, "vlance"))
        self.assertEqual(state["vlance"]["failures_in_a_row"], 0)

    def test_record_run_is_immutable(self):
        old = {"vlance": {"failures_in_a_row": 1}}
        record_run(old, "vlance", ok=False)
        self.assertEqual(old["vlance"]["failures_in_a_row"], 1)

    def test_other_sources_unaffected(self):
        state = {}
        for _ in range(DEFAULT_MAX_FAILURES):
            state = record_run(state, "vlance", ok=False)
        self.assertFalse(is_open(state, "bhw"))


if __name__ == "__main__":
    unittest.main()
