"""
Workers API Client — Send crawled leads to MTK Demand Engines.
==============================================================
Posts extracted leads to the Workers API endpoint for scoring and storage.
"""

import httpx
from loguru import logger
from config import Config


class WorkersClient:
    """HTTP client for the MTK Demand Engines Workers API."""

    def __init__(self, api_url: str | None = None, token: str | None = None):
        self.api_url = (api_url or Config.WORKERS_API_URL).rstrip("/")
        self.token = token or Config.WORKERS_DEMAND_TOKEN
        self._client = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.api_url,
                headers={
                    "X-Demand-Token": self.token,
                    "Content-Type": "application/json",
                },
                timeout=30.0,
            )
        return self._client

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def health_check(self) -> dict:
        """Check if Workers API is reachable."""
        try:
            client = self._get_client()
            resp = await client.get("/api/demand/trang-thai")
            return {"ok": resp.status_code == 200, "status": resp.status_code}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    async def submit_leads(self, leads: list[dict], source: str = "crawl_agent") -> dict:
        """
        Submit crawled leads to the Workers API for scoring.
        Each lead: { source, url, noiDung, tieuDe?, postedAt? }
        """
        if not leads:
            return {"ok": True, "submitted": 0, "message": "No leads to submit"}

        # Format leads for the API
        formatted = []
        for lead in leads:
            formatted.append({
                "source": lead.get("source", source),
                "url": lead.get("url"),
                "noiDung": lead.get("noiDung", lead.get("content", "")),
                "tieuDe": lead.get("tieuDe", lead.get("title")),
                "postedAt": lead.get("postedAt", lead.get("posted_at")),
            })

        try:
            client = self._get_client()
            resp = await client.post(
                "/api/demand/nap",
                json={"leads": formatted},
            )

            if resp.status_code == 200:
                data = resp.json()
                trung = data.get("trung_lead_key", 0)
                logger.info(
                    f"Submitted {len(formatted)} leads → {data.get('da_day_vao_inbox', 0)} accepted"
                    + (f", {trung} trùng đã chặn" if trung else "")
                )
                if not data.get("loc_trung_kha_dung", True):
                    logger.warning(
                        "Server chưa chạy migration 20260814_loc_trung_inbox.sql — "
                        "dedup phía DB đang TẮT, lead trùng có thể vào inbox."
                    )
                return {
                    "ok": True,
                    "submitted": len(formatted),
                    "accepted": data.get("da_day_vao_inbox", 0),
                    "rejected": data.get("bo_qua", 0),
                    "duplicates": trung,
                    "dedup_available": data.get("loc_trung_kha_dung", False),
                    "run_label": data.get("run_label"),
                    "preview": data.get("xem_truoc", []),
                }
            else:
                logger.error(f"Workers API returned {resp.status_code}: {resp.text[:200]}")
                return {"ok": False, "error": f"HTTP {resp.status_code}", "detail": resp.text[:500]}

        except Exception as e:
            logger.error(f"Failed to submit leads: {e}")
            return {"ok": False, "error": str(e)}

    async def trigger_scan(self, source_code: str | None = None) -> dict:
        """Trigger a scan via Workers API (uses existing queue system)."""
        try:
            client = self._get_client()
            params = {"nguon": source_code} if source_code else {}
            resp = await client.post("/api/demand/quet", params=params)

            if resp.status_code == 200:
                return {"ok": True, **resp.json()}
            else:
                return {"ok": False, "error": f"HTTP {resp.status_code}"}

        except Exception as e:
            return {"ok": False, "error": str(e)}

    async def get_sources_status(self) -> dict:
        """Get status of all configured sources."""
        try:
            client = self._get_client()
            resp = await client.get("/api/demand/trang-thai")
            if resp.status_code == 200:
                return {"ok": True, **resp.json()}
            return {"ok": False, "error": f"HTTP {resp.status_code}"}
        except Exception as e:
            return {"ok": False, "error": str(e)}
