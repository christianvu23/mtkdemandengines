"""
Social Media Spider — Camoufox-based crawlers for TikTok & Facebook.
=====================================================================
Uses Camoufox anti-detect browser for platforms with heavy bot detection.
"""

import re
from loguru import logger

from .base import BaseSpider
from engines.camoufox_engine import CamoufoxEngine


class TikTokSpider(BaseSpider):
    """
    Spider for TikTok — searches for marketing-related content.
    Uses Camoufox with Vietnamese fingerprint to bypass TikTok's bot detection.
    """

    name = "tiktok_spider"
    source_code = "tiktok_business"
    engine_type = "camoufox"

    # Search queries for finding marketing opportunities on TikTok
    SEARCH_QUERIES = [
        "cần marketing agency",
        "tìm người chạy ads tiktok",
        "cần làm marketing online",
        "tìm agency branding",
        "cần quay TVC",
        "tìm đội ngũ marketing",
        "cần thiết kế content",
        "marketing campaign needed",
    ]

    async def parse_listing(self, content: str, url: str) -> list[dict]:
        """Parse TikTok search results — already JSON from JS extraction."""
        # Camoufox returns JSON when extract_js is used
        # For listing pages, we get structured data directly
        listings = []

        try:
            # If content is already parsed (from JS extraction)
            if isinstance(content, list):
                for item in content:
                    if isinstance(item, dict):
                        username = item.get("username", "")
                        desc = item.get("description", "") or item.get("bio", "")
                        profile_url = item.get("url", "")

                        if desc or username:
                            listings.append({
                                "url": profile_url or url,
                                "title": f"@{username}" if username else "TikTok User",
                                "snippet": desc,
                                "source_query": url,
                            })
            else:
                # Fallback: parse HTML content
                from scrapling.parser import Selector
                page = Selector(content)

                cards = page.css("[data-e2e='search-card'], .div-item, .user-card")
                for card in cards:
                    username_el = card.css(".span-username, .user-name, [class*='username']")
                    desc_el = card.css(".span-bio, .div-caption, [class*='caption']")

                    username = username_el[0].text.strip() if username_el and username_el[0].text else ""
                    desc = desc_el[0].text.strip() if desc_el and desc_el[0].text else ""

                    link_el = card.css("a")
                    href = link_el[0].attrib.get("href", "") if link_el else ""

                    if username or desc:
                        full_url = href if href.startswith("http") else f"https://www.tiktok.com{href}" if href else url
                        listings.append({
                            "url": full_url,
                            "title": f"@{username}" if username else "TikTok User",
                            "snippet": desc,
                            "source_query": url,
                        })

        except Exception as e:
            logger.error(f"[tiktok] Parse listing error: {e}")

        return listings[:30]

    async def parse_detail(self, content: str, url: str) -> dict | None:
        """Parse TikTok profile/page detail."""
        try:
            if isinstance(content, dict):
                # Already structured from JS
                return {
                    "url": url,
                    "tieuDe": content.get("username", "TikTok User"),
                    "noiDung": f"Username: {content.get('username', '')}\nBio: {content.get('bio', '')}\nFollowers: {content.get('followers', '')}",
                }

            from scrapling.parser import Selector
            page = Selector(content)

            # Extract profile info
            username_el = page.css("[data-e2e='user-title'], .user-name, h1")
            bio_el = page.css("[data-e2e='user-bio'], .user-bio, .bio")
            followers_el = page.css("[data-e2e='followers-count']")

            username = username_el[0].text.strip() if username_el and username_el[0].text else ""
            bio = bio_el[0].text.strip() if bio_el and bio_el[0].text else ""
            followers = followers_el[0].text.strip() if followers_el and followers_el[0].text else ""

            noi_dung = f"TikTok Profile: @{username}\nBio: {bio}\nFollowers: {followers}"

            if not noi_dung.strip():
                return None

            return {
                "url": url,
                "tieuDe": f"@{username}" if username else "TikTok User",
                "noiDung": noi_dung[:8000],
            }
        except Exception as e:
            logger.error(f"[tiktok] Parse detail error: {e}")
            return None

    async def crawl_search_queries(
        self,
        queries: list[str] | None = None,
        max_per_query: int = 10,
        submit: bool = True,
    ) -> dict:
        """
        Crawl TikTok by searching multiple queries.
        Each query gets a separate search page with fingerprint rotation.
        """
        if not self.camoufox:
            self.camoufox = CamoufoxEngine()

        all_leads = []
        stats = {
            "spider": self.name,
            "source": self.source_code,
            "queries_searched": 0,
            "results_found": 0,
            "leads_submitted": 0,
        }

        queries = queries or self.SEARCH_QUERIES

        for query in queries:
            try:
                result = await self.camoufox.scrape_tiktok_search(
                    query=query,
                    max_results=max_per_query,
                )

                if result["ok"] and result.get("content"):
                    stats["queries_searched"] += 1
                    items = result["content"] if isinstance(result["content"], list) else []

                    for item in items:
                        if isinstance(item, dict):
                            lead = {
                                "source": self.source_code,
                                "url": item.get("url", ""),
                                "noiDung": f"Username: {item.get('username', '')}\nBio: {item.get('bio', '')}\nDescription: {item.get('description', '')}",
                                "tieuDe": f"@{item.get('username', '')} — TikTok",
                                "sourceQuery": query,
                            }
                            all_leads.append(lead)
                            stats["results_found"] += 1

                # Delay between queries
                import asyncio
                await asyncio.sleep(5)

            except Exception as e:
                logger.error(f"[tiktok] Search query '{query}' failed: {e}")

        # Submit leads
        if submit and all_leads:
            from utils.workers_client import WorkersClient
            workers = WorkersClient()
            try:
                submit_result = await workers.submit_leads(all_leads, source=self.source_code)
                if submit_result.get("ok"):
                    stats["leads_submitted"] = submit_result.get("accepted", 0)
            finally:
                await workers.close()

        return stats


class FacebookGroupSpider(BaseSpider):
    """
    Spider for Facebook Groups — finds marketing job posts.
    Uses Camoufox with persistent session for group access.
    """

    name = "fb_group_spider"
    source_code = "fb_groups"
    engine_type = "camoufox"

    # Target groups for Vietnamese marketing community
    TARGET_GROUPS = [
        {"url": "https://www.facebook.com/groups/congdongmarketing", "name": "Cộng Đồng Marketing"},
        {"url": "https://www.facebook.com/groups/digitalmarketingvn", "name": "Digital Marketing VN"},
        {"url": "https://www.facebook.com/groups/MarketingOnlineVietNam", "name": "Marketing Online VN"},
        {"url": "https://www.facebook.com/groups/brandingvn", "name": "Branding Vietnam"},
    ]

    # Keywords that signal job opportunities
    LEAD_KEYWORDS = [
        "cần tìm", "tìm người", "tìm agency", "cần chạy ads",
        "tìm freelancer", "cần làm marketing", "thuê ngoài",
        "cần thiết kế", "cần quay", "cần tìm đội",
        "looking for", "need agency", "hiring marketing",
    ]

    async def parse_listing(self, content: str, url: str) -> list[dict]:
        """Parse FB Group posts — already JSON from JS extraction."""
        listings = []

        try:
            if isinstance(content, list):
                for item in content:
                    if isinstance(item, dict):
                        text = item.get("text", "")
                        author = item.get("author", "")
                        post_url = item.get("url", "")

                        # Filter for lead signals
                        if any(kw in text.lower() for kw in self.LEAD_KEYWORDS):
                            listings.append({
                                "url": post_url or url,
                                "title": f"FB Post by {author}" if author else "FB Group Post",
                                "snippet": text[:300],
                                "source_query": url,
                            })
            else:
                # HTML fallback
                from scrapling.parser import Selector
                page = Selector(content)

                posts = page.css('[data-ad-preview="message"], [role="article"]')
                for post in posts:
                    text = post.text.strip() if post.text else ""
                    if any(kw in text.lower() for kw in self.LEAD_KEYWORDS):
                        listings.append({
                            "url": url,
                            "title": "FB Group Post",
                            "snippet": text[:300],
                            "source_query": url,
                        })

        except Exception as e:
            logger.error(f"[fb_group] Parse listing error: {e}")

        return listings[:30]

    async def parse_detail(self, content: str, url: str) -> dict | None:
        """Parse FB post detail."""
        try:
            if isinstance(content, dict):
                return {
                    "url": url,
                    "tieuDe": f"FB Post by {content.get('author', 'Unknown')}",
                    "noiDung": content.get("text", "")[:8000],
                }

            from scrapling.parser import Selector
            page = Selector(content)

            # Try to get main post content
            post_el = page.css('[data-ad-preview="message"], .userContent, [role="article"]')
            text = post_el[0].text.strip() if post_el and post_el[0].text else ""

            if not text:
                return None

            return {
                "url": url,
                "tieuDe": "Facebook Group Post",
                "noiDung": text[:8000],
            }
        except Exception as e:
            logger.error(f"[fb_group] Parse detail error: {e}")
            return None

    async def crawl_groups(
        self,
        groups: list[dict] | None = None,
        max_posts_per_group: int = 30,
        submit: bool = True,
    ) -> dict:
        """
        Crawl multiple Facebook Groups for lead signals.
        Uses Camoufox with session persistence.
        """
        if not self.camoufox:
            self.camoufox = CamoufoxEngine()

        all_leads = []
        stats = {
            "spider": self.name,
            "source": self.source_code,
            "groups_crawled": 0,
            "posts_found": 0,
            "leads_submitted": 0,
        }

        groups = groups or self.TARGET_GROUPS

        for group in groups:
            try:
                result = await self.camoufox.scrape_facebook_group(
                    group_url=group["url"],
                    keywords=self.LEAD_KEYWORDS,
                    max_posts=max_posts_per_group,
                )

                if result["ok"] and result.get("content"):
                    stats["groups_crawled"] += 1
                    posts = result["content"] if isinstance(result["content"], list) else []

                    for post in posts:
                        if isinstance(post, dict):
                            lead = {
                                "source": self.source_code,
                                "url": post.get("url", group["url"]),
                                "noiDung": post.get("text", ""),
                                "tieuDe": f"FB [{group['name']}] by {post.get('author', 'Unknown')}",
                                "sourceQuery": group["url"],
                            }
                            all_leads.append(lead)
                            stats["posts_found"] += 1

                # Delay between groups
                import asyncio
                await asyncio.sleep(8)

            except Exception as e:
                logger.error(f"[fb_group] Crawling group '{group['name']}' failed: {e}")

        # Submit leads
        if submit and all_leads:
            from utils.workers_client import WorkersClient
            workers = WorkersClient()
            try:
                submit_result = await workers.submit_leads(all_leads, source=self.source_code)
                if submit_result.get("ok"):
                    stats["leads_submitted"] = submit_result.get("accepted", 0)
            finally:
                await workers.close()

        return stats
