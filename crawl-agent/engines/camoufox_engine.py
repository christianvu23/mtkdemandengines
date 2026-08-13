"""
Camoufox Engine — Anti-detect browser for social media crawling.
================================================================
Uses Camoufox (Firefox fork) with fingerprint rotation,
human-like behavior simulation, and per-context fingerprinting.
"""

import asyncio
import random
import time
from typing import Any
from loguru import logger


class CamoufoxEngine:
    """
    Anti-detect browser engine using Camoufox.
    Designed for platforms with heavy bot detection:
    - TikTok (fingerprinting + behavioral analysis)
    - Facebook (JS challenges + login walls)
    - LinkedIn (rate limiting + bot detection)
    """

    def __init__(
        self,
        headless: bool = True,
        os_type: str = "windows",
        fingerprint_preset: bool = True,
        block_ads: bool = True,
        proxy: str | None = None,
    ):
        self.headless = headless
        self.os_type = os_type
        self.fingerprint_preset = fingerprint_preset
        self.block_ads = block_ads
        self.proxy = proxy
        self._browser = None

    # ── Browser lifecycle ────────────────────────────────────────
    async def _get_browser(self, fingerprint_config: dict | None = None):
        """Lazy-init Camoufox browser with fingerprint."""
        if self._browser is None:
            try:
                from camoufox.sync_api import Camoufox

                config = {
                    "headless": self.headless,
                    "os": fingerprint_config.get("os", self.os_type) if fingerprint_config else self.os_type,
                }

                if self.fingerprint_preset:
                    config["fingerprint_preset"] = True

                if self.block_ads:
                    config["block_ads"] = True

                if self.proxy:
                    config["proxy"] = {"server": self.proxy}

                # Locale/timezone for Vietnamese market
                config["locale"] = fingerprint_config.get("locale", "vi-VN") if fingerprint_config else "vi-VN"
                config["timezone"] = "Asia/Ho_Chi_Minh"

                self._browser = Camoufox(**config)
                self._browser.__enter__()
                logger.info(f"Camoufox browser initialized (os={config['os']}, headless={self.headless})")

            except ImportError:
                logger.error("Camoufox not installed. Run: pip install camoufox")
                raise
            except Exception as e:
                logger.error(f"Failed to initialize Camoufox: {e}")
                raise

        return self._browser

    async def close(self):
        """Close browser and cleanup."""
        if self._browser:
            try:
                self._browser.__exit__(None, None, None)
            except Exception:
                pass
            self._browser = None
            logger.info("Camoufox browser closed")

    # ── Human-like behavior simulation ───────────────────────────
    @staticmethod
    async def _human_delay(min_ms: int = 500, max_ms: int = 2000):
        """Random delay to simulate human behavior."""
        delay = random.randint(min_ms, max_ms) / 1000.0
        await asyncio.sleep(delay)

    @staticmethod
    async def _human_scroll(page, scrolls: int = 3):
        """Simulate human-like scrolling behavior."""
        for i in range(scrolls):
            # Random scroll distance
            distance = random.randint(300, 800)
            await asyncio.to_thread(lambda: page.mouse.wheel(0, distance))
            await asyncio.sleep(random.uniform(0.8, 2.5))

    @staticmethod
    async def _human_type(page, selector: str, text: str):
        """Type text with human-like speed variations."""
        await asyncio.to_thread(lambda: page.click(selector))
        await asyncio.sleep(random.uniform(0.1, 0.3))

        for char in text:
            await asyncio.to_thread(lambda c=char: page.keyboard.type(c))
            await asyncio.sleep(random.uniform(0.05, 0.15))

    # ── Core scraping ────────────────────────────────────────────
    async def scrape(
        self,
        url: str,
        fingerprint_config: dict | None = None,
        wait_for: str | None = None,
        scroll_count: int = 3,
        extract_js: str | None = None,
        **kwargs,
    ) -> dict:
        """
        Scrape a page with Camoufox anti-detect browser.

        Args:
            url: Target URL
            fingerprint_config: Override fingerprint (os, locale, timezone)
            wait_for: CSS selector to wait for before extracting
            scroll_count: Number of human-like scrolls
            extract_js: JavaScript to execute for data extraction
        """
        browser = await self._get_browser(fingerprint_config)

        try:
            page = await asyncio.to_thread(browser.new_page)

            # Navigate with human-like timing
            await self._human_delay(300, 800)
            await asyncio.to_thread(lambda: page.goto(url, wait_until="domcontentloaded", timeout=30000))

            # Wait for specific content if requested
            if wait_for:
                await asyncio.to_thread(lambda: page.wait_for_selector(wait_for, timeout=10000))

            # Human-like scrolling to trigger lazy loads
            if scroll_count > 0:
                await self._human_scroll(page, scroll_count)

            # Extract content
            if extract_js:
                content = await asyncio.to_thread(lambda: page.evaluate(extract_js))
                format_type = "json"
            else:
                content = await asyncio.to_thread(lambda: page.content())
                format_type = "html"

            # Get page title
            title = await asyncio.to_thread(lambda: page.title())

            await asyncio.to_thread(lambda: page.close())

            return {
                "ok": True,
                "url": url,
                "title": title,
                "content": content,
                "format": format_type,
                "engine": "camoufox",
                "fingerprint": fingerprint_config or {"os": self.os_type},
            }

        except Exception as e:
            logger.error(f"Camoufox scrape failed for {url}: {e}")
            return {"ok": False, "url": url, "error": str(e), "engine": "camoufox"}

    # ── TikTok-specific scraper ──────────────────────────────────
    async def scrape_tiktok_search(
        self,
        query: str,
        max_results: int = 20,
        fingerprint_config: dict | None = None,
    ) -> dict:
        """
        Search TikTok for marketing-related content.
        Extracts user profiles and video descriptions.
        """
        url = f"https://www.tiktok.com/search?q={query.replace(' ', '+')}"
        config = fingerprint_config or {"os": "windows", "locale": "vi-VN"}

        extract_js = """() => {
            const cards = document.querySelectorAll('[data-e2e="search-card"], .div-item');
            const results = [];
            cards.forEach(card => {
                const username = card.querySelector('.span-username, .user-name')?.textContent?.trim();
                const bio = card.querySelector('.span-bio, .user-bio')?.textContent?.trim();
                const desc = card.querySelector('.video-meta-caption, .div-caption')?.textContent?.trim();
                const followers = card.querySelector('.strong-count')?.textContent?.trim();
                if (username || desc) {
                    results.push({
                        username: username || null,
                        bio: bio || null,
                        description: desc || null,
                        followers: followers || null,
                        url: card.querySelector('a')?.href || null,
                    });
                }
            });
            return results.slice(0, """ + str(max_results) + """);
        }"""

        result = await self.scrape(
            url,
            fingerprint_config=config,
            wait_for="[data-e2e='search-card'], .div-item",
            scroll_count=5,
            extract_js=extract_js,
        )

        if result["ok"]:
            result["source"] = "tiktok"
            result["query"] = query

        return result

    # ── Facebook Groups scraper ──────────────────────────────────
    async def scrape_facebook_group(
        self,
        group_url: str,
        keywords: list[str] | None = None,
        max_posts: int = 30,
        fingerprint_config: dict | None = None,
    ) -> dict:
        """
        Scrape Facebook Group posts for lead signals.
        Looks for posts mentioning "looking for", "need agency", etc.
        """
        config = fingerprint_config or {"os": "macos", "locale": "vi-VN"}

        # Build extraction JS with keyword filtering
        kw_filter = ""
        if keywords:
            kw_list = ", ".join(f"'{kw.lower()}'" for kw in keywords)
            kw_filter = f"""
                const keywords = [{kw_list}];
                const textLower = (text || '').toLowerCase();
                if (!keywords.some(kw => textLower.includes(kw))) return;
            """

        extract_js = """() => {
            const posts = document.querySelectorAll('[data-ad-preview="message"], [role="article"]');
            const results = [];
            posts.forEach(post => {
                const text = post.innerText?.trim();
                """ + kw_filter + """
                const author = post.closest('article')?.querySelector('a[role="link"]')?.textContent?.trim();
                const time = post.closest('article')?.querySelector('abbr')?.textContent?.trim();
                if (text && text.length > 30) {
                    results.push({
                        text: text.slice(0, 500),
                        author: author || null,
                        posted: time || null,
                        url: post.closest('article')?.querySelector('a[href*="permalink"]')?.href || null,
                    });
                }
            });
            return results.slice(0, """ + str(max_posts) + """);
        }"""

        result = await self.scrape(
            group_url,
            fingerprint_config=config,
            wait_for='[data-ad-preview="message"], [role="article"]',
            scroll_count=8,
            extract_js=extract_js,
        )

        if result["ok"]:
            result["source"] = "facebook"
            result["group_url"] = group_url

        return result

    # ── Batch scrape with fingerprint rotation ───────────────────
    async def scrape_batch(
        self,
        urls: list[str],
        rotate_fingerprint: bool = True,
        delay_range: tuple[int, int] = (3, 8),
        **kwargs,
    ) -> list[dict]:
        """
        Scrape multiple URLs with fingerprint rotation between each.
        Each URL gets a fresh fingerprint to avoid correlation.
        """
        results = []
        os_options = ["windows", "macos", "linux"]

        for i, url in enumerate(urls):
            # Rotate fingerprint for each URL
            if rotate_fingerprint:
                fp_config = {
                    "os": os_options[i % len(os_options)],
                    "locale": "vi-VN",
                }
            else:
                fp_config = None

            result = await self.scrape(url, fingerprint_config=fp_config, **kwargs)
            results.append(result)

            # Random delay between requests
            if i < len(urls) - 1:
                delay = random.randint(*delay_range)
                logger.debug(f"Camoufox batch: waiting {delay}s before next URL")
                await asyncio.sleep(delay)

        return results

    # ── Session persistence (for login-required sites) ───────────
    async def scrape_with_session(
        self,
        urls: list[str],
        login_url: str | None = None,
        credentials: dict | None = None,
        **kwargs,
    ) -> list[dict]:
        """
        Scrape with persistent session — login once, then scrape multiple pages.
        Useful for Facebook Groups that require login.
        """
        browser = await self._get_browser()
        results = []

        try:
            page = await asyncio.to_thread(browser.new_page)

            # Login if needed
            if login_url and credentials:
                await asyncio.to_thread(lambda: page.goto(login_url, wait_until="domcontentloaded"))
                await self._human_delay(1000, 2000)

                # Fill credentials (selector-based, configurable per site)
                email_sel = credentials.get("email_selector", "input[name='email']")
                pass_sel = credentials.get("pass_selector", "input[name='pass']")
                submit_sel = credentials.get("submit_selector", "button[name='login']")

                await self._human_type(page, email_sel, credentials["email"])
                await self._human_delay(300, 600)
                await self._human_type(page, pass_sel, credentials["password"])
                await self._human_delay(500, 1000)
                await asyncio.to_thread(lambda: page.click(submit_sel))
                await asyncio.sleep(5)  # Wait for login redirect

            # Scrape each URL with same session
            for url in urls:
                await asyncio.to_thread(lambda u=url: page.goto(u, wait_until="domcontentloaded", timeout=30000))
                await self._human_scroll(page, 3)
                content = await asyncio.to_thread(lambda: page.content())
                title = await asyncio.to_thread(lambda: page.title())

                results.append({
                    "ok": True,
                    "url": url,
                    "title": title,
                    "content": content,
                    "format": "html",
                    "engine": "camoufox_session",
                })

                await asyncio.sleep(random.randint(3, 7))

            await asyncio.to_thread(lambda: page.close())

        except Exception as e:
            logger.error(f"Session scrape failed: {e}")
            results.append({"ok": False, "error": str(e), "engine": "camoufox_session"})

        return results
