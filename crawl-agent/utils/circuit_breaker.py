"""
Circuit breaker per source — ngừng hammer nguồn đang chết.
============================================================
Vấn đề: nguồn bị block 403 liên tục vẫn bị cron gọi lại mỗi 30 phút
→ IP ban vĩnh viễn, tốn tài nguyên Camoufox vô ích.

Luật:
- N run liên tiếp KHÔNG fetch được trang nào (pages_fetched == 0 và có lỗi)
  → circuit MỞ, bỏ qua nguồn ở các run sau.
- Run thành công (fetch được >= 1 trang) → circuit ĐÓNG lại, đếm về 0.
- Muốn ép chạy lại nguồn đang mở circuit: xoá entry của nó trong
  data/circuit_state.json hoặc gọi với force=True.

State lưu dạng JSON để sống sót giữa các lần chạy cron.
"""

import json
from pathlib import Path
from datetime import datetime
from loguru import logger

STATE_PATH = Path(__file__).parent.parent / "data" / "circuit_state.json"

# Số run thất bại liên tiếp trước khi mở circuit (khớp Config.CRAWL_MAX_RETRIES)
DEFAULT_MAX_FAILURES = 3


def load_state(path: Path | None = None) -> dict:
    """Đọc circuit state từ disk. Trả {} nếu chưa có hoặc file hỏng."""
    p = path or STATE_PATH
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as e:
            logger.warning(f"Circuit state hỏng, khởi tạo lại: {e}")
    return {}


def save_state(state: dict, path: Path | None = None) -> None:
    """Ghi circuit state ra disk."""
    p = path or STATE_PATH
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def is_open(state: dict, source: str, max_failures: int = DEFAULT_MAX_FAILURES) -> bool:
    """Circuit của source có đang MỞ (bị cấm chạy) không?"""
    entry = state.get(source)
    if not entry:
        return False
    return entry.get("failures_in_a_row", 0) >= max_failures


def record_run(state: dict, source: str, ok: bool) -> dict:
    """
    Ghi nhận kết quả 1 run. HÀM THUẦN — trả state mới, không sửa state cũ.

    @param ok True nếu run fetch được >= 1 trang (kể ra 0 lead vẫn là ok —
              đó là việc của baseline, không phải circuit breaker)
    """
    entry = state.get(source, {"failures_in_a_row": 0})
    now = datetime.now().isoformat()

    if ok:
        new_entry = {"failures_in_a_row": 0, "last_ok_at": now}
    else:
        new_entry = {
            "failures_in_a_row": entry.get("failures_in_a_row", 0) + 1,
            "last_failure_at": now,
        }

    return {**state, source: new_entry}
