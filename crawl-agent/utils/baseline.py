"""
Baseline reconciliation — phát hiện spider "chết lặng lẽ".
==========================================================
Vấn đề: selector vỡ hoặc site chặn → spider trả về 0 lead nhưng orchestrator
vẫn đếm là "thành công". Không có đối chiếu thì loop cron 30 phút sẽ chạy
mãi trong im lặng (Goodhart: đếm leads_submitted làm metric duy nhất).

Luật (reconciliation, không phải assertion):
- Source từng ra >= MIN_GOOD_LINKS links mà giờ 2 run liên tiếp ra 0
  → đánh dấu DEGRADED, cần người xem.
- Run đầu tiên (chưa có baseline) → không kết luận được, ghi nhận baseline.

File này CHỈ chứa logic thuần + I/O JSON tối thiểu; orchestrator gọi.
"""

import json
from pathlib import Path
from datetime import datetime
from loguru import logger

BASELINE_PATH = Path(__file__).parent.parent / "data" / "source_baseline.json"

# Source từng ra ít nhất bao nhiêu links mới được coi là "có baseline"
MIN_GOOD_LINKS = 3
# Bao nhiêu run ra 0 liên tiếp thì báo degraded
ZERO_STREAK_ALERT = 2


def load_baseline(path: Path | None = None) -> dict:
    """Đọc baseline từ disk. Trả {} nếu chưa có hoặc file hỏng."""
    p = path or BASELINE_PATH
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as e:
            logger.warning(f"Baseline file hỏng, khởi tạo lại: {e}")
    return {}


def save_baseline(baseline: dict, path: Path | None = None) -> None:
    """Ghi baseline ra disk (tạo thư mục nếu cần)."""
    p = path or BASELINE_PATH
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(baseline, ensure_ascii=False, indent=2), encoding="utf-8")


def evaluate_run(stats: dict, entry: dict | None) -> dict:
    """
    Đối chiếu kết quả 1 run với baseline cũ. HÀM THUẦN — không I/O.

    @param stats  stats của spider (có links_found)
    @param entry  baseline entry cũ của source (hoặc None nếu lần đầu)
    @returns {
        "status": "first_run" | "ok" | "degraded" | "watch",
        "new_entry": {...},   # entry mới để lưu lại
    }
    """
    links = stats.get("links_found", 0)
    now = datetime.now().isoformat()

    if entry is None:
        return {
            "status": "first_run",
            "new_entry": {
                "last_good_links": links if links > 0 else 0,
                "zero_streak": 0 if links > 0 else 1,
                "last_run_at": now,
            },
        }

    prev_good = entry.get("last_good_links", 0)
    streak = entry.get("zero_streak", 0)

    if links > 0:
        return {
            "status": "ok",
            "new_entry": {
                "last_good_links": links,
                "zero_streak": 0,
                "last_run_at": now,
            },
        }

    # Run này ra 0 links
    streak += 1
    new_entry = {
        "last_good_links": prev_good,
        "zero_streak": streak,
        "last_run_at": now,
    }

    if prev_good >= MIN_GOOD_LINKS and streak >= ZERO_STREAK_ALERT:
        # Từng có dữ liệu mà giờ tịt liên tục → gần như chắc selector hỏng/bị chặn
        return {"status": "degraded", "new_entry": new_entry}

    return {"status": "watch", "new_entry": new_entry}


def update_baseline(baseline: dict, source: str, stats: dict) -> tuple[dict, str]:
    """
    Cập nhật baseline cho 1 source. HÀM THUẦN — trả dict mới, không sửa dict cũ.

    @returns (baseline_mới, status)
    """
    verdict = evaluate_run(stats, baseline.get(source))
    new_baseline = {**baseline, source: verdict["new_entry"]}
    return new_baseline, verdict["status"]
