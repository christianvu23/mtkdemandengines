"""
Base Spider — Abstract base for all crawl spiders.
===================================================
Provides common interface, lead extraction, and Workers API submission.
"""

import asyncio
import hashlib
from abc import ABC, abstractmethod
from datetime import datetime
from loguru import logger

from engines.scrapling_engine import ScraplingEngine
from engines.camoufox_engine import CamoufoxEngine
from utils.workers_client import WorkersClient


class BaseSpider(ABC):
    """
    Abstract base spider that all source-specific spiders inherit from.
    Handles: engine routing, lead extraction, dedup, and API submission.
    """

    # Override in subclass
    name: str = "base"
    source_code: str = "unknown"
    engine_type: str = "scrapling_fast"  # "scrapling_fast" | "scrapling_stealth" | "camoufox"

    def __init__(
        self,
        scrapling: ScraplingEngine | None = None,
        camoufox: CamoufoxEngine | None = None,
        workers: WorkersClient | None = None,
    ):
        self.scrapling = scrapling or ScraplingEngine()
        self.camoufox = camoufox
        self.workers = workers or WorkersClient()
        self._seen_urls: set[str] = set()

    # ── Abstract methods (override in subclass) ──────────────────
    @abstractmethod
    async def parse_listing(self, content: str, url: str) -> list[dict]:
        """
        Parse a listing/search page → extract individual job/post links.
        Returns: [{"url": "...", "title": "...", "snippet": "..."}, ...]
        """
        pass

    @abstractmethod
    async def parse_detail(self, content: str, url: str) -> dict | None:
        """
        Parse a detail page → extract full job/post content.
        Returns: {"noiDung": "...", "tieuDe": "...", "postedAt": "..."} or None
        """
        pass

    # ── Engine routing ───────────────────────────────────────────
    async def fetch(self, url: str, **kwargs) -> dict:
        """Fetch URL using the spider's configured engine."""
        if self.engine_type == "camoufox":
            if not self.camoufox:
                self.camoufox = CamoufoxEngine()
            return await self.camoufox.scrape(url, **kwargs)
        else:
            return await self.scrapling.fetch(url, engine=self.engine_type, **kwargs)

    # ── Dedup ────────────────────────────────────────────────────
    def _url_key(self, url: str) -> str:
        """Generate dedup key from URL."""
        normalized = url.rstrip("/").lower()
        return hashlib.md5(normalized.encode()).hexdigest()

    def is_new(self, url: str) -> bool:
        """Check if URL has been seen before in this run."""
        key = self._url_key(url)
        if key in self._seen_urls:
            return False
        self._seen_urls.add(key)
        return True

    # ── Lead formatting ──────────────────────────────────────────
    def format_lead(self, detail: dict, listing_info: dict, source_code: str | None = None) -> dict:
        """
        Format extracted data into lead payload for Workers API.
        Matches the format expected by /api/demand/nap endpoint.
        """
        return {
            "source": source_code or self.source_code,
            "url": detail.get("url") or listing_info.get("url"),
            "noiDung": detail.get("noiDung", detail.get("content", "")),
            "tieuDe": detail.get("tieuDe", detail.get("title", listing_info.get("title"))),
            "postedAt": detail.get("postedAt", detail.get("posted_at")),
            "sourceQuery": listing_info.get("source_query", ""),
        }

    # ── Main crawl loop ──────────────────────────────────────────
    async def crawl(
        self,
        start_urls: list[str],
        max_pages: int = 5,
        max_details: int = 50,
        delay: float = 3.0,
        submit: bool = True,
        **kwargs,
    ) -> dict:
        """
        Full crawl cycle:
        1. Fetch listing pages
        2. Extract individual post links
        3. Fetch each post detail
        4. Format as leads
        5. Submit to Workers API

        Returns stats dict.
        """
        stats = {
            "spider": self.name,
            "source": self.source_code,
            "started_at": datetime.now().isoformat(),
            "pages_fetched": 0,
            "links_found": 0,
            "details_fetched": 0,
            "leads_extracted": 0,
            "leads_submitted": 0,
            "errors": [],
        }

        all_listings = []
        all_leads = []

        # Phase 1: Crawl listing pages
        logger.info(f"[{self.name}] Phase 1: Crawling {len(start_urls)} listing pages")
        for url in start_urls[:max_pages]:
            try:
                result = await self.fetch(url, **kwargs)
                if not result["ok"]:
                    stats["errors"].append({"url": url, "error": result.get("error", "unknown")})
                    continue

                stats["pages_fetched"] += 1
                listings = await self.parse_listing(result["content"], url)

                for listing in listings:
                    if self.is_new(listing.get("url", "")):
                        all_listings.append(listing)

                await asyncio.sleep(delay)

            except Exception as e:
                logger.error(f"[{self.name}] Error fetching {url}: {e}")
                stats["errors"].append({"url": url, "error": str(e)})

        stats["links_found"] = len(all_listings)
        logger.info(f"[{self.name}] Found {len(all_listings)} unique links")

        # Phase 2: Fetch detail pages
        logger.info(f"[{self.name}] Phase 2: Fetching {min(len(all_listings), max_details)} detail pages")
        for listing in all_listings[:max_details]:
            try:
                detail_url = listing.get("url")
                if not detail_url:
                    continue

                result = await self.fetch(detail_url, **kwargs)
                if not result["ok"]:
                    stats["errors"].append({"url": detail_url, "error": result.get("error", "unknown")})
                    continue

                stats["details_fetched"] += 1
                detail = await self.parse_detail(result["content"], detail_url)

                if detail:
                    lead = self.format_lead(detail, listing)
                    all_leads.append(lead)
                    stats["leads_extracted"] += 1

                await asyncio.sleep(delay)

            except Exception as e:
                logger.error(f"[{self.name}] Error fetching detail: {e}")
                stats["errors"].append({"error": str(e)})

        logger.info(f"[{self.name}] Extracted {stats['leads_extracted']} leads")

        # Phase 3: Submit to Workers API
        if submit and all_leads:
            logger.info(f"[{self.name}] Phase 3: Submitting {len(all_leads)} leads to Workers API")
            try:
                submit_result = await self.workers.submit_leads(all_leads, source=self.source_code)
                if submit_result.get("ok"):
                    stats["leads_submitted"] = submit_result.get("accepted", 0)
                    stats["run_label"] = submit_result.get("run_label")
                else:
                    stats["errors"].append({"phase": "submit", "error": submit_result.get("error")})
            except Exception as e:
                logger.error(f"[{self.name}] Submit failed: {e}")
                stats["errors"].append({"phase": "submit", "error": str(e)})

        stats["finished_at"] = datetime.now().isoformat()
        logger.info(f"[{self.name}] Crawl complete: {stats['leads_submitted']} leads submitted")

        return stats

    # ── Cleanup ──────────────────────────────────────────────────
    async def close(self):
        """Cleanup resources."""
        if self.camoufox:
            await self.camoufox.close()
        if self.workers:
            await self.workers.close()
