"""
Scrapling Engine — Fast + Stealth crawling via Scrapling framework.
=================================================================
Uses Scrapling's FetcherSession (fast, impersonated) and
StealthySession (Cloudflare bypass) for different site protection levels.
"""

import asyncio
from typing import AsyncGenerator
from loguru import logger

from scrapling.fetchers import Fetcher, FetcherSession, StealthyFetcher, StealthySession


class ScraplingEngine:
    """
    Dual-mode Scrapling engine:
    - fast mode: FetcherSession with browser impersonation (no JS needed)
    - stealth mode: StealthySession with Cloudflare solving (JS-heavy sites)
    """

    def __init__(self, proxy: str | None = None):
        self.proxy = proxy

    # ── Fast mode: FetcherSession ────────────────────────────────
    async def fetch_fast(self, url: str, **kwargs) -> dict:
        """
        Fast fetch — impersonate Chrome/Firefox TLS fingerprint.
        Good for: forums, job boards without Cloudflare, static sites.
        """
        try:
            page = await asyncio.to_thread(
                lambda: Fetcher.get(
                    url,
                    stealthy_headers=True,
                    impersonate="chrome",
                    timeout=kwargs.get("timeout", 30),
                    proxy=self.proxy,
                )
            )
            return {
                "ok": True,
                "url": url,
                "content": str(page),
                "format": "html",
                "engine": "scrapling_fast",
                "status": getattr(page, "status", 200),
            }
        except Exception as e:
            logger.warning(f"Fast fetch failed for {url}: {e}")
            return {"ok": False, "url": url, "error": str(e), "engine": "scrapling_fast"}

    # ── Stealth mode: StealthyFetcher ────────────────────────────
    async def fetch_stealth(self, url: str, **kwargs) -> dict:
        """
        Stealth fetch — full browser with Cloudflare bypass.
        Good for: vLance, sites with JS challenges, anti-bot protections.
        """
        try:
            page = await asyncio.to_thread(
                lambda: StealthyFetcher.fetch(
                    url,
                    headless=True,
                    solve_cloudflare=kwargs.get("solve_cloudflare", True),
                    block_webrtc=kwargs.get("block_webrtc", False),
                    network_idle=kwargs.get("network_idle", True),
                    timeout=kwargs.get("timeout", 45000),
                    proxy=self.proxy,
                )
            )
            return {
                "ok": True,
                "url": url,
                "content": str(page),
                "format": "html",
                "engine": "scrapling_stealth",
                "status": getattr(page, "status", 200),
            }
        except Exception as e:
            logger.warning(f"Stealth fetch failed for {url}: {e}")
            return {"ok": False, "url": url, "error": str(e), "engine": "scrapling_stealth"}

    # ── Smart fetch: auto-escalate ───────────────────────────────
    async def fetch(self, url: str, engine: str = "fast", **kwargs) -> dict:
        """
        Smart fetch — try fast first, escalate to stealth if needed.
        engine: "fast" | "stealth" | "auto"
        """
        if engine == "fast":
            result = await self.fetch_fast(url, **kwargs)
        elif engine == "stealth":
            result = await self.fetch_stealth(url, **kwargs)
        elif engine == "auto":
            result = await self.fetch_fast(url, **kwargs)
            if not result["ok"] or result.get("status") in (403, 429, 503):
                logger.info(f"Escalating {url} from fast → stealth (status={result.get('status')})")
                result = await self.fetch_stealth(url, **kwargs)
        else:
            result = await self.fetch_fast(url, **kwargs)

        return result

    # ── Batch fetch with concurrency control ─────────────────────
    async def fetch_batch(
        self,
        urls: list[str],
        engine: str = "fast",
        concurrency: int = 5,
        delay: float = 2.0,
        **kwargs,
    ) -> list[dict]:
        """
        Fetch multiple URLs with concurrency limit and delay between batches.
        """
        results = []
        semaphore = asyncio.Semaphore(concurrency)

        async def _fetch_one(url: str) -> dict:
            async with semaphore:
                result = await self.fetch(url, engine=engine, **kwargs)
                await asyncio.sleep(delay)  # Polite delay
                return result

        tasks = [_fetch_one(url) for url in urls]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Handle exceptions
        processed = []
        for i, r in enumerate(results):
            if isinstance(r, Exception):
                processed.append({"ok": False, "url": urls[i], "error": str(r)})
            else:
                processed.append(r)

        return processed

    # ── Extract with CSS selectors ───────────────────────────────
    async def extract(
        self,
        url: str,
        selectors: dict[str, str],
        engine: str = "fast",
        **kwargs,
    ) -> dict:
        """
        Fetch and extract specific data using CSS selectors.
        selectors: {"title": "h1.title", "items": ".item-list li", ...}
        """
        result = await self.fetch(url, engine=engine, **kwargs)
        if not result["ok"]:
            return result

        content = result["content"]
        extracted = {}

        # Use Scrapling's parser for CSS extraction
        try:
            from scrapling.parser import Selector
            page = Selector(content)

            for field, selector in selectors.items():
                elements = page.css(selector)
                if elements:
                    if "list" in field.lower() or "items" in field.lower():
                        extracted[field] = [el.text for el in elements if el.text]
                    else:
                        extracted[field] = elements[0].text if elements[0].text else None
                else:
                    extracted[field] = None
        except Exception as e:
            logger.warning(f"CSS extraction failed for {url}: {e}")
            extracted = {"error": str(e)}

        return {**result, "extracted": extracted}
