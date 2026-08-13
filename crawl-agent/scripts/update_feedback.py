#!/usr/bin/env python3
"""
update_feedback.py — Nạp quyết định duyệt lead từ Workers API vào feedback.json
=================================================================================
Chạy định kỳ (sau mỗi đợt review lead trên dashboard):

    python scripts/update_feedback.py

Đọc /api/demand/phan-hoi (cần WORKERS_DEMAND_TOKEN), ghi data/feedback.json.
classify_fast.py sẽ tự động đọc file này ở lần chạy kế tiếp.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import asyncio
from datetime import datetime, timezone
from loguru import logger

from config import Config
from utils.workers_client import WorkersClient
from utils.feedback import save_feedback


async def fetch_feedback() -> dict:
    """Gọi Workers API, trả feedback dạng {positive, negative, updated_at}."""
    client = WorkersClient()
    try:
        # WorkersClient chưa có method riêng — gọi trực tiếp endpoint
        http = client._get_client()
        resp = await http.get("/api/demand/phan-hoi", params={"limit": 200})
        if resp.status_code != 200:
            raise RuntimeError(f"HTTP {resp.status_code}: {resp.text[:200]}")
        data = resp.json()
        return {
            "positive": data.get("tin_hieu_duong", []),
            "negative": data.get("tin_hieu_am", []),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    finally:
        await client.close()


async def main() -> None:
    if not Config.WORKERS_DEMAND_TOKEN:
        logger.error("Thiếu WORKERS_DEMAND_TOKEN — không gọi được Workers API")
        sys.exit(1)

    feedback = await fetch_feedback()
    save_feedback(feedback)

    logger.info(
        f"✅ Đã lưu feedback: {len(feedback['positive'])} tín hiệu dương, "
        f"{len(feedback['negative'])} tín hiệu âm → data/feedback.json"
    )


if __name__ == "__main__":
    asyncio.run(main())
