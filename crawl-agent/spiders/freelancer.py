"""
Freelancer Spider — Crawls Vietnamese & international freelancer job boards.
============================================================================
Targets: vLance.vn, Freelancer.vn, PeoplePerHour, etc.
Engine: Scrapling Stealth (for vLance Cloudflare) + Fast (for others)
"""

import re
from loguru import logger
from scrapling.parser import Selector

from .base import BaseSpider


class VLanceSpider(BaseSpider):
    """
    Spider for vLance.vn — Vietnamese freelance marketplace.
    Uses stealth engine because vLance blocks non-browser requests (403).
    """

    name = "vlance_spider"
    source_code = "vlance"
    engine_type = "scrapling_stealth"

    async def parse_listing(self, content: str, url: str) -> list[dict]:
        """Parse vLance listing page → extract job links."""
        listings = []
        try:
            page = Selector(content)

            # vLance job cards — try multiple selector strategies
            # Strategy 1: Known card structure
            cards = page.css(".project-card, .job-card, .listing-item, article.job-item")

            # Strategy 2: If no cards found, use link pattern matching
            if not cards:
                links = page.css("a[href*='/du-an/'], a[href*='/viec/']")
                for link in links:
                    href = link.attrib.get("href", "")
                    title = link.text.strip() if link.text else ""
                    if title and len(title) > 10 and "/du-an/" in href:
                        full_url = href if href.startswith("http") else f"https://vlance.vn{href}"
                        listings.append({"url": full_url, "title": title, "snippet": ""})
                return listings[:40]

            for card in cards:
                # Extract link
                link_el = card.css("a[href*='/du-an/']")
                if not link_el:
                    link_el = card.css("a")

                href = link_el[0].attrib.get("href", "") if link_el else ""
                if not href:
                    continue

                full_url = href if href.startswith("http") else f"https://vlance.vn{href}"

                # Extract title
                title_el = card.css("h2, h3, .title, .project-title, .job-title")
                title = title_el[0].text.strip() if title_el and title_el[0].text else ""

                # Extract snippet/description
                desc_el = card.css(".description, .summary, .excerpt, p")
                snippet = desc_el[0].text.strip() if desc_el and desc_el[0].text else ""

                # Extract budget if available
                budget_el = card.css(".budget, .price, .amount")
                budget = budget_el[0].text.strip() if budget_el and budget_el[0].text else ""

                listings.append({
                    "url": full_url,
                    "title": title,
                    "snippet": f"{snippet} {budget}".strip(),
                    "source_query": url,
                })

        except Exception as e:
            logger.error(f"[vlance] Parse listing error: {e}")

        return listings[:40]

    async def parse_detail(self, content: str, url: str) -> dict | None:
        """Parse vLance job detail page."""
        try:
            page = Selector(content)

            # Title
            title_el = page.css("h1, .project-title, .job-title")
            title = title_el[0].text.strip() if title_el and title_el[0].text else ""

            # Full description — try multiple selectors
            desc_el = (
                page.css(".project-description, .job-description, .detail-content")
                or page.css("article, .content, main")
            )
            noi_dung = desc_el[0].text.strip() if desc_el and desc_el[0].text else ""

            if not noi_dung and not title:
                return None

            # Extract budget
            budget_patterns = [
                r"ngân\s*sách[:\s]*(\d[\d,.]*)\s*(vnd|USD|\$)?",
                r"budget[:\s]*(\d[\d,.]*)\s*(vnd|USD|\$)?",
                r"(\d[\d,.]*)\s*(vnd|triệu|USD|\$)",
            ]
            budget = None
            for pattern in budget_patterns:
                match = re.search(pattern, noi_dung, re.IGNORECASE)
                if match:
                    budget = match.group(0)
                    break

            # Extract contact info
            contact_patterns = [
                r"(zalo|phone|sdt|điện\s*thoại|liên\s*hệ)[:\s]*([\d\s.+()-]+)",
                r"(email|mail)[:\s]*([\w.+-]+@[\w.-]+)",
            ]
            contact_info = ""
            for pattern in contact_patterns:
                matches = re.findall(pattern, noi_dung, re.IGNORECASE)
                if matches:
                    contact_info += " " + " ".join(str(m[-1]) for m in matches)

            return {
                "url": url,
                "tieuDe": title,
                "noiDung": f"{title}\n\n{noi_dung}\n\n{contact_info}".strip()[:8000],
                "postedAt": None,  # vLance doesn't always show date clearly
            }

        except Exception as e:
            logger.error(f"[vlance] Parse detail error: {e}")
            return None


class FreelancerVNSpider(BaseSpider):
    """
    Spider for Freelancer.vn — another Vietnamese freelance marketplace.
    """

    name = "freelancer_vn_spider"
    source_code = "freelancer_vn"
    engine_type = "scrapling_stealth"

    async def parse_listing(self, content: str, url: str) -> list[dict]:
        listings = []
        try:
            page = Selector(content)

            # Look for project/job cards
            cards = page.css(".project-card, .job-item, .card-item, [class*='project']")

            if not cards:
                # Fallback: find links with /projects/ pattern
                links = page.css("a[href*='/projects/']")
                for link in links:
                    href = link.attrib.get("href", "")
                    title = link.text.strip() if link.text else ""
                    if title and len(title) > 10:
                        full_url = href if href.startswith("http") else f"https://www.freelancer.vn{href}"
                        listings.append({"url": full_url, "title": title})
                return listings[:40]

            for card in cards:
                link_el = card.css("a[href]")
                href = link_el[0].attrib.get("href", "") if link_el else ""
                title_el = card.css("h2, h3, h4, .title, [class*='title']")
                title = title_el[0].text.strip() if title_el and title_el[0].text else ""

                if href and title:
                    full_url = href if href.startswith("http") else f"https://www.freelancer.vn{href}"
                    listings.append({"url": full_url, "title": title})

        except Exception as e:
            logger.error(f"[freelancer_vn] Parse listing error: {e}")

        return listings[:40]

    async def parse_detail(self, content: str, url: str) -> dict | None:
        try:
            page = Selector(content)
            title_el = page.css("h1, [class*='title']")
            title = title_el[0].text.strip() if title_el and title_el[0].text else ""

            desc_el = page.css(".description, .content, article, main")
            noi_dung = desc_el[0].text.strip() if desc_el and desc_el[0].text else ""

            if not noi_dung:
                return None

            return {
                "url": url,
                "tieuDe": title,
                "noiDung": f"{title}\n\n{noi_dung}"[:8000],
            }
        except Exception as e:
            logger.error(f"[freelancer_vn] Parse detail error: {e}")
            return None


class PeoplePerHourSpider(BaseSpider):
    """
    Spider for PeoplePerHour — international freelance marketplace.
    Uses fast engine (no heavy protection).
    """

    name = "pph_spider"
    source_code = "peopleperhour"
    engine_type = "scrapling_fast"

    async def parse_listing(self, content: str, url: str) -> list[dict]:
        listings = []
        try:
            page = Selector(content)
            cards = page.css(".item, .job-card, article, [class*='project']")

            for card in cards:
                link_el = card.css("a[href*='/project/'], a[href*='/job/']")
                if not link_el:
                    link_el = card.css("a[href]")

                href = link_el[0].attrib.get("href", "") if link_el else ""
                title_el = card.css("h2, h3, .title, [class*='title']")
                title = title_el[0].text.strip() if title_el and title_el[0].text else ""

                if href and title and len(title) > 5:
                    full_url = href if href.startswith("http") else f"https://www.peopleperhour.com{href}"
                    listings.append({"url": full_url, "title": title})

        except Exception as e:
            logger.error(f"[pph] Parse listing error: {e}")

        return listings[:40]

    async def parse_detail(self, content: str, url: str) -> dict | None:
        try:
            page = Selector(content)
            title_el = page.css("h1, [class*='title']")
            title = title_el[0].text.strip() if title_el and title_el[0].text else ""

            desc_el = page.css(".description, .content, article, main, [class*='description']")
            noi_dung = desc_el[0].text.strip() if desc_el and desc_el[0].text else ""

            if not noi_dung:
                return None

            return {
                "url": url,
                "tieuDe": title,
                "noiDung": f"{title}\n\n{noi_dung}"[:8000],
            }
        except Exception as e:
            logger.error(f"[pph] Parse detail error: {e}")
            return None
