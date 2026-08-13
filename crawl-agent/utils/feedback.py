"""
Feedback memory — học từ quyết định duyệt lead của người.
===========================================================
Theo nguyên tắc "MÁY ĐỀ XUẤT, NGƯỜI BẤM": ground truth duy nhất là các
quyết định duyệt/bỏ trên dashboard (demand_leads.status). Module này đọc
data/feedback.json (do scripts/update_feedback.py nạp từ Workers API) và
biến nó thành đoạn prompt bias cho bộ phân loại.

Máy KHÔNG bao giờ tự ghi quyết định vào feedback — chỉ người mới làm vậy
qua dashboard. Đây là red-line của loop: judgment ở phía người.
"""

import json
from pathlib import Path
from loguru import logger

FEEDBACK_PATH = Path(__file__).parent.parent / "data" / "feedback.json"
MAX_EXAMPLES = 10


def load_feedback(path: Path | None = None) -> dict:
    """Đọc feedback từ disk. Trả structure rỗng nếu chưa có hoặc file hỏng."""
    p = path or FEEDBACK_PATH
    if p.exists():
        try:
            data = json.loads(p.read_text(encoding="utf-8"))
            return {
                "positive": data.get("positive", []),
                "negative": data.get("negative", []),
                "updated_at": data.get("updated_at"),
            }
        except (json.JSONDecodeError, OSError) as e:
            logger.warning(f"Feedback file hỏng, bỏ qua: {e}")
    return {"positive": [], "negative": [], "updated_at": None}


def save_feedback(feedback: dict, path: Path | None = None) -> None:
    """Ghi feedback ra disk (chỉ scripts/update_feedback.py gọi)."""
    p = path or FEEDBACK_PATH
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(feedback, ensure_ascii=False, indent=2), encoding="utf-8")


def _mo_ta(muc: dict) -> str:
    """Một dòng mô tả lead dùng trong prompt."""
    tieu_de = (muc.get("tieu_de") or "(không tiêu đề)")[:100]
    nhu_cau = ", ".join(muc.get("nhu_cau", [])[:3])
    return f"- {tieu_de} [{nhu_cau or 'chưa rõ nhu cầu'}]"


def build_preference_prompt(feedback: dict, max_examples: int = MAX_EXAMPLES) -> str:
    """
    Biến lịch sử duyệt thành đoạn prompt bias. HÀM THUẦN.
    Trả "" nếu chưa có dữ liệu — khi đó prompt phân loại không thay đổi.
    """
    lines = []

    duong = feedback.get("positive", [])
    am = feedback.get("negative", [])

    if duong:
        lines.append("# Các lead người dùng ĐÃ CHỌN (tín hiệu dương):")
        lines.extend(_mo_ta(m) for m in duong[-max_examples:])

    if am:
        if lines:
            lines.append("")
        lines.append("# Các lead người dùng ĐÃ BỎ (tín hiệu âm):")
        lines.extend(_mo_ta(m) for m in am[-max_examples:])

    if not lines:
        return ""

    lines.append("")
    lines.append(
        "Dựa vào các mẫu trên để bias việc chấm điểm: lead giống tín hiệu dương "
        "được cộng điểm, lead giống tín hiệu âm bị trừ điểm."
    )
    return "\n".join(lines)
