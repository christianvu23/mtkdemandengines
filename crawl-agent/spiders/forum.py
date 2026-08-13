"""
Forum Spider — Crawls marketing forums for lead signals.
=========================================================
Targets: BlackHatWorld, WarriorForum, VOZ marketing, etc.
Engine: Scrapling Fast (forums generally have light protection)
"""

import re
from loguru import logger
from scrapling.parser import Selector

from .base import BaseSpider


# ── Lead signal keywords ─────────────────────────────────────────
# Posts matching these are likely job opportunities
LEAD_SIGNALS_VN = [
    "cần tìm", "cần thuê", "tìm người", "tìm agency", "tìm freelancer",
    "cần người", "nhận làm", "tìm đội", "cần đội", "tìm bạn",
    "cần chạy ads", "cần làm marketing", "cần thiết kế", "cần quay",
    "tìm đối tác", "cần đối tác", "tìm cộng tác", "thuê ngoài",
    "cần tìm đội ngũ", "cần tìm team",
]

LEAD_SIGNALS_EN = [
    "looking for", "need help with", "hiring", "looking to hire",
    "need a", "looking for agency", "need someone to", "looking for freelancer",
    "need marketing", "looking for marketing", "want to hire",
    "rfq", "request for", "need a team",
]

ALL_SIGNALS = LEAD_SIGNALS_VN + LEAD_SIGNALS_EN


def is_lead_signal(text: str) -> bool:
    """Check if text contains signals of a job opportunity."""
    text_lower = text.lower()
    return any(signal in text_lower for signal in ALL_SIGNALS)


class BlackHatWorldSpider(BaseSpider):
    """
    Spider for BlackHatWorld marketplace & forums.
    BHW has a marketplace section where people post service needs.
    """

    name = "bhw_spider"
    source_code = "bhw"
    engine_type = "scrapling_fast"

    async def parse_listing(self, content: str, url: str) -> list[dict]:
        listings = []
        try:
            page = Selector(content)

            # BHW thread list structure
            threads = page.css(
                "li.thread, .discussionListItem, .structItem, "
                "[data-template='thread_list'], .p-body-main a[href*='threads/']"
            )

            if not threads:
                # Fallback: find thread links
                threads = page.css("a[href*='/threads/']")

            for thread in threads:
                # Get link
                link_el = thread.css("a[href*='/threads/']") if thread.css("a[href*='/threads/']") else [thread]
                href = link_el[0].attrib.get("href", "") if link_el else ""
                if not href:
                    continue

                # Get title
                title_el = thread.css("a[data-tp-title], .thread-title, h3, .title")
                title = title_el[0].text.strip() if title_el and title_el[0].text else ""
                if not title:
                    title = link_el[0].text.strip() if link_el[0].text else ""

                # Get snippet
                snippet_el = thread.css(".snippet, .thread-excerpt, .lastPost")
                snippet = snippet_el[0].text.strip() if snippet_el and snippet_el[0].text else ""

                # Only include if it looks like a lead signal
                combined_text = f"{title} {snippet}"
                if is_lead_signal(combined_text) or any(
                    kw in combined_text.lower()
                    for kw in ["marketing", "branding", "social media", "ads", "tvc", "content", "seo"]
                ):
                    full_url = href if href.startswith("http") else f"https://www.blackhatworld.com{href}"
                    listings.append({
                        "url": full_url,
                        "title": title,
                        "snippet": snippet[:200],
                        "source_query": url,
                    })

        except Exception as e:
            logger.error(f"[bhw] Parse listing error: {e}")

        return listings[:40]

    async def parse_detail(self, content: str, url: str) -> dict | None:
        try:
            page = Selector(content)

            # BHW post structure
            title_el = page.css("h1, .p-title-value, .thread-title")
            title = title_el[0].text.strip() if title_el and title_el[0].text else ""

            # Get first post content
            post_el = page.css(
                ".bbWrapper, .message-body .bbWrapper, "
                "article:first-child .bbWrapper, .post-content"
            )
            noi_dung = post_el[0].text.strip() if post_el and post_el[0].text else ""

            if not noi_dung:
                # Fallback: get all text
                body = page.css("body")
                noi_dung = body[0].text.strip()[:3000] if body and body[0].text else ""

            if not noi_dung:
                return None

            return {
                "url": url,
                "tieuDe": title,
                "noiDung": f"{title}\n\n{noi_dung}"[:8000],
            }
        except Exception as e:
            logger.error(f"[bhw] Parse detail error: {e}")
            return None


class WarriorForumSpider(BaseSpider):
    """
    Spider for WarriorForum — one of the largest internet marketing forums.
    """

    name = "warriorforum_spider"
    source_code = "warriorforum"
    engine_type = "scrapling_fast"

    async def parse_listing(self, content: str, url: str) -> list[dict]:
        listings = []
        try:
            page = Selector(content)

            # WarriorForum thread structure
            threads = page.css(
                ".threadbit, .discussionListItem, li.leveln, "
                "a[href*='/thread/']"
            )

            for thread in threads:
                link_el = thread.css("a[href*='/thread/']") if thread.css("a[href*='/thread/']") else [thread]
                href = link_el[0].attrib.get("href", "") if link_el else ""
                title = link_el[0].text.strip() if link_el[0].text else ""

                if not title or len(title) < 10:
                    continue

                snippet_el = thread.css(".threadmeta, .excerpt, .lastpost")
                snippet = snippet_el[0].text.strip() if snippet_el and snippet_el[0].text else ""

                combined = f"{title} {snippet}"
                if is_lead_signal(combined) or any(
                    kw in combined.lower()
                    for kw in ["marketing", "ads", "campaign", "branding", "social media", "freelance"]
                ):
                    full_url = href if href.startswith("http") else f"https://www.warriorforum.com{href}"
                    listings.append({
                        "url": full_url,
                        "title": title,
                        "snippet": snippet[:200],
                        "source_query": url,
                    })

        except Exception as e:
            logger.error(f"[warriorforum] Parse listing error: {e}")

        return listings[:40]

    async def parse_detail(self, content: str, url: str) -> dict | None:
        try:
            page = Selector(content)
            title_el = page.css("h1, .threadtitle, .title")
            title = title_el[0].text.strip() if title_el and title_el[0].text else ""

            post_el = page.css(".post-content, .message-body, article")
            noi_dung = post_el[0].text.strip() if post_el and post_el[0].text else ""

            if not noi_dung:
                return None

            return {
                "url": url,
                "tieuDe": title,
                "noiDung": f"{title}\n\n{noi_dung}"[:8000],
            }
        except Exception as e:
            logger.error(f"[warriorforum] Parse detail error: {e}")
            return None


class VozMarketingSpider(BaseSpider):
    """
    Spider for VOZ forum marketing section (voz.vn).
    Vietnamese tech/marketing forum — needs stealth for anti-bot.
    """

    name = "voz_spider"
    source_code = "voz_marketing"
    engine_type = "scrapling_stealth"

    async def parse_listing(self, content: str, url: str) -> list[dict]:
        listings = []
        try:
            page = Selector(content)

            # VOZ uses XenForo — thread list structure
            threads = page.css(
                ".structItem, .structItem--thread, "
                "a[href*='/t/'], a[href*='threads/']"
            )

            for thread in threads:
                link_el = thread.css("a[href*='/t/']") if thread.css("a[href*='/t/']") else [thread]
                href = link_el[0].attrib.get("href", "") if link_el else ""
                title = link_el[0].text.strip() if link_el[0].text else ""

                if not title or len(title) < 8:
                    continue

                # Get preview/snippet
                snippet_el = thread.css(".structItem-overview, .lastPost")
                snippet = snippet_el[0].text.strip() if snippet_el and snippet_el[0].text else ""

                combined = f"{title} {snippet}"
                if is_lead_signal(combined) or any(
                    kw in combined.lower()
                    for kw in ["marketing", "ads", "tvc", "branding", "content", "pr", "agency"]
                ):
                    full_url = href if href.startswith("http") else f"https://voz.vn{href}"
                    listings.append({
                        "url": full_url,
                        "title": title,
                        "snippet": snippet[:200],
                        "source_query": url,
                    })

        except Exception as e:
            logger.error(f"[voz] Parse listing error: {e}")

        return listings[:40]

    async def parse_detail(self, content: str, url: str) -> dict | None:
        try:
            page = Selector(content)
            title_el = page.css("h1, .p-title-value")
            title = title_el[0].text.strip() if title_el and title_el[0].text else ""

            # First post content
            post_el = page.css(".bbWrapper, .message-body, article.postBody")
            noi_dung = post_el[0].text.strip() if post_el and post_el[0].text else ""

            if not noi_dung:
                return None

            return {
                "url": url,
                "tieuDe": title,
                "noiDung": f"{title}\n\n{noi_dung}"[:8000],
            }
        except Exception as e:
            logger.error(f"[voz] Parse detail error: {e}")
            return None


# ═══════════════════════════════════════════════════════════════════════
# NEW FORUM SPIDERS — Vietnamese Marketing Communities (Aug 2026)
# ═══════════════════════════════════════════════════════════════════════


class BrandsVietnamSpider(BaseSpider):
    """
    Spider for BrandsVietnam.com — Premier Vietnamese marketing & branding community.
    Platform for sharing marketing knowledge, industry data, and networking.
    Has forum, articles, and community discussions about marketing needs.
    """

    name = "brands_vietnam_spider"
    source_code = "brands_vietnam"
    engine_type = "scrapling_fast"

    async def parse_listing(self, content: str, url: str) -> list[dict]:
        listings = []
        try:
            page = Selector(content)

            # BrandsVietnam uses a CMS/forum structure
            threads = page.css(
                ".discussionListItem, .structItem, "
                "a[href*='/threads/'], a[href*='/bai-viet/'], "
                "[class*='thread'], [class*='article']"
            )

            if not threads:
                # Fallback: find article/thread links
                links = page.css("a[href*='/threads/'], a[href*='/bai-viet/'], a[href*='/dien-dan/']")
                for link in links:
                    href = link.attrib.get("href", "")
                    title = link.text.strip() if link.text else ""
                    if title and len(title) > 8 and href:
                        full_url = href if href.startswith("http") else f"https://www.brandsvietnam.com{href}"
                        combined = title.lower()
                        if is_lead_signal(combined) or any(
                            kw in combined
                            for kw in ["marketing", "branding", "ads", "tvc", "content", "agency", "freelancer", "chiến dịch"]
                        ):
                            listings.append({
                                "url": full_url, "title": title,
                                "snippet": "", "source_query": url,
                            })
                return listings[:40]

            for thread in threads:
                link_el = thread.css("a[href*='/threads/'], a[href*='/bai-viet/'], a[href]")
                href = link_el[0].attrib.get("href", "") if link_el else ""
                title_el = thread.css("h2, h3, .title, [class*='title']")
                title = title_el[0].text.strip() if title_el and title_el[0].text else ""
                if not title:
                    title = link_el[0].text.strip() if link_el[0].text else ""

                snippet_el = thread.css(".snippet, .excerpt, .lastPost, p")
                snippet = snippet_el[0].text.strip() if snippet_el and snippet_el[0].text else ""

                combined = f"{title} {snippet}"
                if is_lead_signal(combined) or any(
                    kw in combined.lower()
                    for kw in ["marketing", "branding", "ads", "tvc", "content", "agency", "freelancer", "chiến dịch", "quảng cáo"]
                ):
                    full_url = href if href.startswith("http") else f"https://www.brandsvietnam.com{href}"
                    listings.append({
                        "url": full_url,
                        "title": title,
                        "snippet": snippet[:200],
                        "source_query": url,
                    })

        except Exception as e:
            logger.error(f"[brands_vietnam] Parse listing error: {e}")

        return listings[:40]

    async def parse_detail(self, content: str, url: str) -> dict | None:
        try:
            page = Selector(content)
            title_el = page.css("h1, .p-title-value, [class*='title']")
            title = title_el[0].text.strip() if title_el and title_el[0].text else ""

            post_el = page.css(".bbWrapper, .message-body, .content, article, main")
            noi_dung = post_el[0].text.strip() if post_el and post_el[0].text else ""

            if not noi_dung:
                return None

            return {
                "url": url,
                "tieuDe": title,
                "noiDung": f"{title}\n\n{noi_dung}"[:8000],
            }
        except Exception as e:
            logger.error(f"[brands_vietnam] Parse detail error: {e}")
            return None


class VietnamMarketingSpider(BaseSpider):
    """
    Spider for VietnamMarketing.com.vn — Vietnamese marketing community.
    Has articles comparing freelancer vs agency, marketing discussions.
    """

    name = "vn_marketing_spider"
    source_code = "vn_marketing"
    engine_type = "scrapling_fast"

    async def parse_listing(self, content: str, url: str) -> list[dict]:
        listings = []
        try:
            page = Selector(content)

            # Find article/thread links
            threads = page.css(
                "article, .post-item, .thread-item, "
                "a[href*='/dien-dan/'], a[href*='/hoi-dap/'], "
                "a[href*='/bai-viet/']"
            )

            if not threads:
                links = page.css("a[href]")
                for link in links:
                    href = link.attrib.get("href", "")
                    title = link.text.strip() if link.text else ""
                    if title and len(title) > 10 and href and not href.startswith("http"):
                        combined = title.lower()
                        if is_lead_signal(combined) or any(
                            kw in combined
                            for kw in ["marketing", "freelancer", "agency", "quảng cáo", "ads", "branding", "fanpage"]
                        ):
                            full_url = f"https://vietnammarketing.com.vn{href}"
                            listings.append({
                                "url": full_url, "title": title,
                                "snippet": "", "source_query": url,
                            })
                return listings[:40]

            for thread in threads:
                link_el = thread.css("a[href]")
                href = link_el[0].attrib.get("href", "") if link_el else ""
                title_el = thread.css("h2, h3, .title, [class*='title']")
                title = title_el[0].text.strip() if title_el and title_el[0].text else ""
                if not title:
                    title = link_el[0].text.strip() if link_el[0].text else ""

                if not title or len(title) < 10:
                    continue

                combined = title.lower()
                if is_lead_signal(combined) or any(
                    kw in combined
                    for kw in ["marketing", "freelancer", "agency", "quảng cáo", "ads", "branding", "fanpage", "tvc", "content"]
                ):
                    full_url = href if href.startswith("http") else f"https://vietnammarketing.com.vn{href}"
                    listings.append({
                        "url": full_url,
                        "title": title,
                        "snippet": "",
                        "source_query": url,
                    })

        except Exception as e:
            logger.error(f"[vn_marketing] Parse listing error: {e}")

        return listings[:40]

    async def parse_detail(self, content: str, url: str) -> dict | None:
        try:
            page = Selector(content)
            title_el = page.css("h1, [class*='title']")
            title = title_el[0].text.strip() if title_el and title_el[0].text else ""

            post_el = page.css(".content, article, main, .post-content, .entry-content")
            noi_dung = post_el[0].text.strip() if post_el and post_el[0].text else ""

            if not noi_dung:
                return None

            return {
                "url": url,
                "tieuDe": title,
                "noiDung": f"{title}\n\n{noi_dung}"[:8000],
            }
        except Exception as e:
            logger.error(f"[vn_marketing] Parse detail error: {e}")
            return None
