"""
Structured error envelope — lỗi phải mang theo cách xử lý.
============================================================
Theo agent-harness-construction: mọi error path phải có
  - kind: phân loại nguyên nhân gốc
  - retryable: có nên retry không
  - hint: chỉ dẫn phục hồi an toàn (recovery contract)
và stop condition rõ ràng (retryable=False = dừng, đừng hammer).

Trước đây stats["errors"] chỉ chứa chuỗi thô — orchestrator không phân biệt
được "timeout retry được" với "bị block, càng retry càng bị ban".
"""

import re

# Thứ tự quan trọng: pattern đặc thù check trước pattern tổng quát
_CLASSIFIERS = [
    ("robots_disallowed", r"robots_disallowed", False,
     "Tôn trọng robots.txt — bỏ URL này khỏi config, không tìm cách lách."),
    ("url_unsafe", r"url_unsafe", False,
     "URL không an toàn (private IP/localhost/metadata) — kiểm tra lại config nguồn."),
    ("rate_limited", r"\b429\b|rate.?limit|too many requests", True,
     "Bị giới hạn tần suất — tăng delay giữa các request, giảm concurrency, "
     "đợi ít nhất 60s trước khi chạy lại nguồn này."),
    ("blocked", r"\b403\b|\b401\b|access denied|cloudflare|captcha|blocked|challenge", False,
     "Site đang chặn — ĐỪNG hammer tiếp. Escalate lên engine stealth/camoufox, "
     "hoặc mở trình thật kiểm tra trang còn sống không. Nếu chặn lâu dài, cân nhắc bỏ nguồn."),
    ("timeout", r"time.?out|timed out", True,
     "Tăng timeout hoặc chuyển sang engine chậm hơn nhưng ổn định hơn."),
    ("dns_network", r"dns|name resolution|connection|network|unreachable|reset", True,
     "Lỗi mạng tạm thời — retry với backoff; nếu lặp lại nhiều run, kiểm tra proxy."),
    ("parse", r"parse|selector|decode", False,
     "Trang đổi cấu trúc hoặc selector hỏng — cần người cập nhật selector, "
     "retry vô ích."),
]


def classify(error, status: int | None = None) -> dict:
    """
    Phân loại một lỗi fetch. HÀM THUẦN.

    @returns {"kind": str, "retryable": bool, "hint": str}
    """
    text = str(error or "").lower()
    if status is not None:
        text = f"{status} {text}"

    for kind, pattern, retryable, hint in _CLASSIFIERS:
        if re.search(pattern, text):
            return {"kind": kind, "retryable": retryable, "hint": hint}

    return {
        "kind": "unknown",
        "retryable": True,
        "hint": "Lỗi chưa phân loại — retry với backoff; nếu lặp lại, đọc error gốc để bổ sung luật phân loại.",
    }


def make_error(phase: str, error, url: str | None = None, status: int | None = None) -> dict:
    """
    Tạo error envelope chuẩn cho stats["errors"]. HÀM THUẦN.

    @param phase  "listing" | "detail" | "submit" | "guard"
    """
    cls = classify(error, status)
    return {
        "phase": phase,
        "url": url,
        "error": str(error),
        "kind": cls["kind"],
        "retryable": cls["retryable"],
        "hint": cls["hint"],
    }
