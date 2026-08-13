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


# ═══════════════════════════════════════════════════════════════════════
# NEW SPIDERS — Added from Vietnam freelancer scraping (Aug 2026)
# ═══════════════════════════════════════════════════════════════════════


class FastlanceSpider(BaseSpider):
    """
    Spider for Fastlance.vn — Top Vietnamese freelance platform.
    50,000+ freelancers, 3000+ businesses trust. Has dedicated marketing services.
    Engine: scrapling_stealth (may have bot protection).
    """

    name = "fastlance_spider"
    source_code = "fastlance"
    engine_type = "scrapling_stealth"

    async def parse_listing(self, content: str, url: str) -> list[dict]:
        listings = []
        try:
            page = Selector(content)
            # Fastlance service/freelancer cards
            cards = page.css(
                ".service-card, .freelancer-card, .gig-card, "
                "[class*='service'], [class*='gig'], "
                "article, .card"
            )
            if not cards:
                # Fallback: find links with service pattern
                links = page.css("a[href*='/dich-vu/'], a[href*='/gig/'], a[href*='/freelancer/']")
                for link in links:
                    href = link.attrib.get("href", "")
                    title = link.text.strip() if link.text else ""
                    if title and len(title) > 8 and href:
                        full_url = href if href.startswith("http") else f"https://fastlance.vn{href}"
                        listings.append({"url": full_url, "title": title, "snippet": "", "source_query": url})
                return listings[:40]

            for card in cards:
                link_el = card.css("a[href]")
                href = link_el[0].attrib.get("href", "") if link_el else ""
                title_el = card.css("h2, h3, h4, .title, [class*='title'], [class*='name']")
                title = title_el[0].text.strip() if title_el and title_el[0].text else ""
                desc_el = card.css(".description, .summary, p, [class*='desc']")
                snippet = desc_el[0].text.strip() if desc_el and desc_el[0].text else ""

                if href and title:
                    full_url = href if href.startswith("http") else f"https://fastlance.vn{href}"
                    listings.append({
                        "url": full_url,
                        "title": title,
                        "snippet": snippet[:200],
                        "source_query": url,
                    })
        except Exception as e:
            logger.error(f"[fastlance] Parse listing error: {e}")
        return listings[:40]

    async def parse_detail(self, content: str, url: str) -> dict | None:
        try:
            page = Selector(content)
            title_el = page.css("h1, [class*='title'], [class*='name']")
            title = title_el[0].text.strip() if title_el and title_el[0].text else ""
            desc_el = page.css(".description, .content, article, main, [class*='detail']")
            noi_dung = desc_el[0].text.strip() if desc_el and desc_el[0].text else ""
            if not noi_dung:
                return None
            return {
                "url": url,
                "tieuDe": title,
                "noiDung": f"{title}\n\n{noi_dung}"[:8000],
            }
        except Exception as e:
            logger.error(f"[fastlance] Parse detail error: {e}")
            return None


class VietGigsSpider(BaseSpider):
    """
    Spider for VietGigs.vn — Vietnamese freelancer marketplace.
    Has dedicated categories: Social Media Ads, TVC & Video, Content.
    """

    name = "vietgigs_spider"
    source_code = "vietgigs"
    engine_type = "scrapling_stealth"

    async def parse_listing(self, content: str, url: str) -> list[dict]:
        listings = []
        try:
            page = Selector(content)
            cards = page.css(
                ".gig-card, .service-card, [class*='gig'], "
                "[class*='service'], article, .card"
            )
            if not cards:
                links = page.css("a[href*='/gigs/'], a[href*='/service/']")
                for link in links:
                    href = link.attrib.get("href", "")
                    title = link.text.strip() if link.text else ""
                    if title and len(title) > 8 and href:
                        full_url = href if href.startswith("http") else f"https://vietgigs.vn{href}"
                        listings.append({"url": full_url, "title": title, "snippet": "", "source_query": url})
                return listings[:40]

            for card in cards:
                link_el = card.css("a[href]")
                href = link_el[0].attrib.get("href", "") if link_el else ""
                title_el = card.css("h2, h3, h4, .title, [class*='title']")
                title = title_el[0].text.strip() if title_el and title_el[0].text else ""
                desc_el = card.css(".description, p, [class*='desc']")
                snippet = desc_el[0].text.strip() if desc_el and desc_el[0].text else ""

                if href and title:
                    full_url = href if href.startswith("http") else f"https://vietgigs.vn{href}"
                    listings.append({
                        "url": full_url, "title": title,
                        "snippet": snippet[:200], "source_query": url,
                    })
        except Exception as e:
            logger.error(f"[vietgigs] Parse listing error: {e}")
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
            return {"url": url, "tieuDe": title, "noiDung": f"{title}\n\n{noi_dung}"[:8000]}
        except Exception as e:
            logger.error(f"[vietgigs] Parse detail error: {e}")
            return None


class GigHitSpider(BaseSpider):
    """
    Spider for GigHit.vn — New Vietnamese freelancer platform.
    Focuses on quality freelancers: design, dev, marketing, translation.
    """

    name = "gighit_spider"
    source_code = "gighit"
    engine_type = "scrapling_stealth"

    async def parse_listing(self, content: str, url: str) -> list[dict]:
        listings = []
        try:
            page = Selector(content)
            cards = page.css("[class*='gig'], [class*='service'], article, .card")
            if not cards:
                links = page.css("a[href*='/gigs/'], a[href*='/service/']")
                for link in links:
                    href = link.attrib.get("href", "")
                    title = link.text.strip() if link.text else ""
                    if title and len(title) > 8 and href:
                        full_url = href if href.startswith("http") else f"https://gighit.vn{href}"
                        listings.append({"url": full_url, "title": title, "snippet": "", "source_query": url})
                return listings[:40]

            for card in cards:
                link_el = card.css("a[href]")
                href = link_el[0].attrib.get("href", "") if link_el else ""
                title_el = card.css("h2, h3, .title, [class*='title']")
                title = title_el[0].text.strip() if title_el and title_el[0].text else ""
                if href and title:
                    full_url = href if href.startswith("http") else f"https://gighit.vn{href}"
                    listings.append({"url": full_url, "title": title, "snippet": "", "source_query": url})
        except Exception as e:
            logger.error(f"[gighit] Parse listing error: {e}")
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
            return {"url": url, "tieuDe": title, "noiDung": f"{title}\n\n{noi_dung}"[:8000]}
        except Exception as e:
            logger.error(f"[gighit] Parse detail error: {e}")
            return None


class JobBoardVNSpider(BaseSpider):
    """
    Spider for JobBoard.vn — Vietnamese freelancer job board.
    Has marketing freelance category.
    """

    name = "jobboard_vn_spider"
    source_code = "jobboard_vn"
    engine_type = "scrapling_fast"

    async def parse_listing(self, content: str, url: str) -> list[dict]:
        listings = []
        try:
            page = Selector(content)
            cards = page.css(".job-card, .job-item, article, [class*='job']")
            if not cards:
                links = page.css("a[href*='/viec-lam/'], a[href*='/job/']")
                for link in links:
                    href = link.attrib.get("href", "")
                    title = link.text.strip() if link.text else ""
                    if title and len(title) > 8 and href:
                        full_url = href if href.startswith("http") else f"https://www.jobboard.vn{href}"
                        listings.append({"url": full_url, "title": title, "snippet": "", "source_query": url})
                return listings[:40]

            for card in cards:
                link_el = card.css("a[href]")
                href = link_el[0].attrib.get("href", "") if link_el else ""
                title_el = card.css("h2, h3, .title, [class*='title']")
                title = title_el[0].text.strip() if title_el and title_el[0].text else ""
                desc_el = card.css(".description, .summary, p")
                snippet = desc_el[0].text.strip() if desc_el and desc_el[0].text else ""
                if href and title:
                    full_url = href if href.startswith("http") else f"https://www.jobboard.vn{href}"
                    listings.append({
                        "url": full_url, "title": title,
                        "snippet": snippet[:200], "source_query": url,
                    })
        except Exception as e:
            logger.error(f"[jobboard_vn] Parse listing error: {e}")
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
            return {"url": url, "tieuDe": title, "noiDung": f"{title}\n\n{noi_dung}"[:8000]}
        except Exception as e:
            logger.error(f"[jobboard_vn] Parse detail error: {e}")
            return None


class JobsGoSpider(BaseSpider):
    """
    Spider for JobsGo.vn — Has freelancer/remote Google Ads positions.
    """

    name = "jobsgo_spider"
    source_code = "jobsgo"
    engine_type = "scrapling_fast"

    async def parse_listing(self, content: str, url: str) -> list[dict]:
        listings = []
        try:
            page = Selector(content)
            cards = page.css(".job-item, .job-card, article, [class*='job']")
            if not cards:
                links = page.css("a[href*='/viec-lam/'], a[href*='/job/']")
                for link in links:
                    href = link.attrib.get("href", "")
                    title = link.text.strip() if link.text else ""
                    if title and len(title) > 8 and href:
                        full_url = href if href.startswith("http") else f"https://jobsgo.vn{href}"
                        listings.append({"url": full_url, "title": title, "snippet": "", "source_query": url})
                return listings[:40]

            for card in cards:
                link_el = card.css("a[href]")
                href = link_el[0].attrib.get("href", "") if link_el else ""
                title_el = card.css("h2, h3, .title, [class*='title']")
                title = title_el[0].text.strip() if title_el and title_el[0].text else ""
                if href and title:
                    full_url = href if href.startswith("http") else f"https://jobsgo.vn{href}"
                    listings.append({"url": full_url, "title": title, "snippet": "", "source_query": url})
        except Exception as e:
            logger.error(f"[jobsgo] Parse listing error: {e}")
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
            return {"url": url, "tieuDe": title, "noiDung": f"{title}\n\n{noi_dung}"[:8000]}
        except Exception as e:
            logger.error(f"[jobsgo] Parse detail error: {e}")
            return None


class UpworkVNSpider(BaseSpider):
    """
    Spider for Upwork Vietnam — International platform with large VN freelancer pool.
    1000+ Freelance Marketing jobs in Vietnam. Has Hanoi/HCMC specific pages.
    """

    name = "upwork_vn_spider"
    source_code = "upwork_vn"
    engine_type = "scrapling_fast"

    async def parse_listing(self, content: str, url: str) -> list[dict]:
        listings = []
        try:
            page = Selector(content)
            # Upwork freelancer profile cards
            cards = page.css(
                "[data-test='freelancer-tile'], .upwork-tile, "
                "[class*='tile'], [class*='card'], article"
            )
            if not cards:
                links = page.css("a[href*='/freelancers/'], a[href*='/profile/']")
                for link in links:
                    href = link.attrib.get("href", "")
                    title = link.text.strip() if link.text else ""
                    if title and len(title) > 5 and href and "upwork.com" in href:
                        listings.append({"url": href, "title": title, "snippet": "", "source_query": url})
                return listings[:40]

            for card in cards:
                link_el = card.css("a[href*='/freelancers/'], a[href*='/profile/']")
                href = link_el[0].attrib.get("href", "") if link_el else ""
                title_el = card.css("h2, h3, h4, .title, [class*='name'], [class*='title']")
                title = title_el[0].text.strip() if title_el and title_el[0].text else ""
                desc_el = card.css(".description, .snippet, p, [class*='desc']")
                snippet = desc_el[0].text.strip() if desc_el and desc_el[0].text else ""
                if href and title:
                    full_url = href if href.startswith("http") else f"https://www.upwork.com{href}"
                    listings.append({
                        "url": full_url, "title": title,
                        "snippet": snippet[:200], "source_query": url,
                    })
        except Exception as e:
            logger.error(f"[upwork_vn] Parse listing error: {e}")
        return listings[:40]

    async def parse_detail(self, content: str, url: str) -> dict | None:
        try:
            page = Selector(content)
            title_el = page.css("h1, [class*='name'], [class*='title']")
            title = title_el[0].text.strip() if title_el and title_el[0].text else ""
            desc_el = page.css(".description, .content, article, main, [class*='bio']")
            noi_dung = desc_el[0].text.strip() if desc_el and desc_el[0].text else ""
            if not noi_dung:
                return None
            return {"url": url, "tieuDe": title, "noiDung": f"{title}\n\n{noi_dung}"[:8000]}
        except Exception as e:
            logger.error(f"[upwork_vn] Parse detail error: {e}")
            return None


class FreelancerComVNSpider(BaseSpider):
    """
    Spider for Freelancer.com Vietnam — Global platform with VN freelancer section.
    Has Digital Marketers for hire in Vietnam, Marketing Specialists.
    """

    name = "freelancer_com_vn_spider"
    source_code = "freelancer_com_vn"
    engine_type = "scrapling_fast"

    async def parse_listing(self, content: str, url: str) -> list[dict]:
        listings = []
        try:
            page = Selector(content)
            cards = page.css("[class*='card'], [class*='item'], article, .job-item")
            if not cards:
                links = page.css("a[href*='/freelancers/'], a[href*='/projects/'], a[href*='/jobs/']")
                for link in links:
                    href = link.attrib.get("href", "")
                    title = link.text.strip() if link.text else ""
                    if title and len(title) > 5 and href:
                        full_url = href if href.startswith("http") else f"https://www.freelancer.com{href}"
                        listings.append({"url": full_url, "title": title, "snippet": "", "source_query": url})
                return listings[:40]

            for card in cards:
                link_el = card.css("a[href]")
                href = link_el[0].attrib.get("href", "") if link_el else ""
                title_el = card.css("h2, h3, .title, [class*='title']")
                title = title_el[0].text.strip() if title_el and title_el[0].text else ""
                if href and title:
                    full_url = href if href.startswith("http") else f"https://www.freelancer.com{href}"
                    listings.append({"url": full_url, "title": title, "snippet": "", "source_query": url})
        except Exception as e:
            logger.error(f"[freelancer_com_vn] Parse listing error: {e}")
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
            return {"url": url, "tieuDe": title, "noiDung": f"{title}\n\n{noi_dung}"[:8000]}
        except Exception as e:
            logger.error(f"[freelancer_com_vn] Parse detail error: {e}")
            return None


class TruelancerVNSpider(BaseSpider):
    """
    Spider for Truelancer Vietnam — Has Digital Marketing & Video Production jobs in VN.
    """

    name = "truelancer_vn_spider"
    source_code = "truelancer_vn"
    engine_type = "scrapling_fast"

    async def parse_listing(self, content: str, url: str) -> list[dict]:
        listings = []
        try:
            page = Selector(content)
            cards = page.css("[class*='card'], [class*='item'], article")
            if not cards:
                links = page.css("a[href*='/freelance-'], a[href*='/projects/']")
                for link in links:
                    href = link.attrib.get("href", "")
                    title = link.text.strip() if link.text else ""
                    if title and len(title) > 5 and href:
                        full_url = href if href.startswith("http") else f"https://www.truelancer.com{href}"
                        listings.append({"url": full_url, "title": title, "snippet": "", "source_query": url})
                return listings[:40]

            for card in cards:
                link_el = card.css("a[href]")
                href = link_el[0].attrib.get("href", "") if link_el else ""
                title_el = card.css("h2, h3, .title, [class*='title']")
                title = title_el[0].text.strip() if title_el and title_el[0].text else ""
                if href and title:
                    full_url = href if href.startswith("http") else f"https://www.truelancer.com{href}"
                    listings.append({"url": full_url, "title": title, "snippet": "", "source_query": url})
        except Exception as e:
            logger.error(f"[truelancer_vn] Parse listing error: {e}")
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
            return {"url": url, "tieuDe": title, "noiDung": f"{title}\n\n{noi_dung}"[:8000]}
        except Exception as e:
            logger.error(f"[truelancer_vn] Parse detail error: {e}")
            return None


class BehanceVNSpider(BaseSpider):
    """
    Spider for Behance Vietnam — Portfolio-based hiring for brand designers in VN.
    """

    name = "behance_vn_spider"
    source_code = "behance_vn"
    engine_type = "scrapling_fast"

    async def parse_listing(self, content: str, url: str) -> list[dict]:
        listings = []
        try:
            page = Selector(content)
            # Behance project cards
            cards = page.css("[class*='project'], .project-card, article")
            if not cards:
                links = page.css("a[href*='/projects/'], a[href*='/profiles/']")
                for link in links:
                    href = link.attrib.get("href", "")
                    title = link.text.strip() if link.text else ""
                    if title and len(title) > 5 and href:
                        full_url = href if href.startswith("http") else f"https://www.behance.net{href}"
                        listings.append({"url": full_url, "title": title, "snippet": "", "source_query": url})
                return listings[:40]

            for card in cards:
                link_el = card.css("a[href]")
                href = link_el[0].attrib.get("href", "") if link_el else ""
                title_el = card.css("h2, h3, .title, [class*='title'], [class*='name']")
                title = title_el[0].text.strip() if title_el and title_el[0].text else ""
                if href and title:
                    full_url = href if href.startswith("http") else f"https://www.behance.net{href}"
                    listings.append({"url": full_url, "title": title, "snippet": "", "source_query": url})
        except Exception as e:
            logger.error(f"[behance_vn] Parse listing error: {e}")
        return listings[:40]

    async def parse_detail(self, content: str, url: str) -> dict | None:
        try:
            page = Selector(content)
            title_el = page.css("h1, [class*='title']")
            title = title_el[0].text.strip() if title_el and title_el[0].text else ""
            desc_el = page.css(".description, .content, article, main, [class*='bio']")
            noi_dung = desc_el[0].text.strip() if desc_el and desc_el[0].text else ""
            if not noi_dung:
                return None
            return {"url": url, "tieuDe": title, "noiDung": f"{title}\n\n{noi_dung}"[:8000]}
        except Exception as e:
            logger.error(f"[behance_vn] Parse detail error: {e}")
            return None


class ContraVNSpider(BaseSpider):
    """
    Spider for Contra.com Vietnam — Brand design freelancers in Vietnam.
    """

    name = "contra_vn_spider"
    source_code = "contra_vn"
    engine_type = "scrapling_fast"

    async def parse_listing(self, content: str, url: str) -> list[dict]:
        listings = []
        try:
            page = Selector(content)
            cards = page.css("[class*='card'], [class*='item'], article")
            if not cards:
                links = page.css("a[href*='/discover/'], a[href*='/profile/']")
                for link in links:
                    href = link.attrib.get("href", "")
                    title = link.text.strip() if link.text else ""
                    if title and len(title) > 5 and href:
                        full_url = href if href.startswith("http") else f"https://contra.com{href}"
                        listings.append({"url": full_url, "title": title, "snippet": "", "source_query": url})
                return listings[:40]

            for card in cards:
                link_el = card.css("a[href]")
                href = link_el[0].attrib.get("href", "") if link_el else ""
                title_el = card.css("h2, h3, .title, [class*='title']")
                title = title_el[0].text.strip() if title_el and title_el[0].text else ""
                if href and title:
                    full_url = href if href.startswith("http") else f"https://contra.com{href}"
                    listings.append({"url": full_url, "title": title, "snippet": "", "source_query": url})
        except Exception as e:
            logger.error(f"[contra_vn] Parse listing error: {e}")
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
            return {"url": url, "tieuDe": title, "noiDung": f"{title}\n\n{noi_dung}"[:8000]}
        except Exception as e:
            logger.error(f"[contra_vn] Parse detail error: {e}")
            return None


class CareerVietSpider(BaseSpider):
    """
    Spider for CareerViet.vn — Major VN job board with 363+ Digital Marketing freelancer jobs.
    """

    name = "careerviet_spider"
    source_code = "careerviet"
    engine_type = "scrapling_fast"

    async def parse_listing(self, content: str, url: str) -> list[dict]:
        listings = []
        try:
            page = Selector(content)
            cards = page.css(".job-item, .job-card, [class*='job'], article")
            if not cards:
                links = page.css("a[href*='/viec-lam/']")
                for link in links:
                    href = link.attrib.get("href", "")
                    title = link.text.strip() if link.text else ""
                    if title and len(title) > 8 and href:
                        full_url = href if href.startswith("http") else f"https://careerviet.vn{href}"
                        listings.append({"url": full_url, "title": title, "snippet": "", "source_query": url})
                return listings[:40]

            for card in cards:
                link_el = card.css("a[href]")
                href = link_el[0].attrib.get("href", "") if link_el else ""
                title_el = card.css("h2, h3, .title, [class*='title']")
                title = title_el[0].text.strip() if title_el and title_el[0].text else ""
                desc_el = card.css(".description, .summary, p")
                snippet = desc_el[0].text.strip() if desc_el and desc_el[0].text else ""
                if href and title:
                    full_url = href if href.startswith("http") else f"https://careerviet.vn{href}"
                    listings.append({
                        "url": full_url, "title": title,
                        "snippet": snippet[:200], "source_query": url,
                    })
        except Exception as e:
            logger.error(f"[careerviet] Parse listing error: {e}")
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
            return {"url": url, "tieuDe": title, "noiDung": f"{title}\n\n{noi_dung}"[:8000]}
        except Exception as e:
            logger.error(f"[careerviet] Parse detail error: {e}")
            return None


class TopCVSpider(BaseSpider):
    """
    Spider for TopCV.vn — VN job board with 60+ Marketing Freelancer positions.
    """

    name = "topcv_spider"
    source_code = "topcv"
    engine_type = "scrapling_fast"

    async def parse_listing(self, content: str, url: str) -> list[dict]:
        listings = []
        try:
            page = Selector(content)
            cards = page.css(".job-item, .job-card, [class*='job'], article")
            if not cards:
                links = page.css("a[href*='/viec-lam/']")
                for link in links:
                    href = link.attrib.get("href", "")
                    title = link.text.strip() if link.text else ""
                    if title and len(title) > 8 and href:
                        full_url = href if href.startswith("http") else f"https://www.topcv.vn{href}"
                        listings.append({"url": full_url, "title": title, "snippet": "", "source_query": url})
                return listings[:40]

            for card in cards:
                link_el = card.css("a[href]")
                href = link_el[0].attrib.get("href", "") if link_el else ""
                title_el = card.css("h2, h3, .title, [class*='title']")
                title = title_el[0].text.strip() if title_el and title_el[0].text else ""
                if href and title:
                    full_url = href if href.startswith("http") else f"https://www.topcv.vn{href}"
                    listings.append({"url": full_url, "title": title, "snippet": "", "source_query": url})
        except Exception as e:
            logger.error(f"[topcv] Parse listing error: {e}")
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
            return {"url": url, "tieuDe": title, "noiDung": f"{title}\n\n{noi_dung}"[:8000]}
        except Exception as e:
            logger.error(f"[topcv] Parse detail error: {e}")
            return None


class Job123Spider(BaseSpider):
    """
    Spider for 123Job.vn — Has Facebook Marketing & Google Ads Freelancer categories.
    """

    name = "123job_spider"
    source_code = "123job"
    engine_type = "scrapling_fast"

    async def parse_listing(self, content: str, url: str) -> list[dict]:
        listings = []
        try:
            page = Selector(content)
            cards = page.css(".job-item, .job-card, [class*='job'], article")
            if not cards:
                links = page.css("a[href*='/viec-lam/']")
                for link in links:
                    href = link.attrib.get("href", "")
                    title = link.text.strip() if link.text else ""
                    if title and len(title) > 8 and href:
                        full_url = href if href.startswith("http") else f"https://123job.vn{href}"
                        listings.append({"url": full_url, "title": title, "snippet": "", "source_query": url})
                return listings[:40]

            for card in cards:
                link_el = card.css("a[href]")
                href = link_el[0].attrib.get("href", "") if link_el else ""
                title_el = card.css("h2, h3, .title, [class*='title']")
                title = title_el[0].text.strip() if title_el and title_el[0].text else ""
                if href and title:
                    full_url = href if href.startswith("http") else f"https://123job.vn{href}"
                    listings.append({"url": full_url, "title": title, "snippet": "", "source_query": url})
        except Exception as e:
            logger.error(f"[123job] Parse listing error: {e}")
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
            return {"url": url, "tieuDe": title, "noiDung": f"{title}\n\n{noi_dung}"[:8000]}
        except Exception as e:
            logger.error(f"[123job] Parse detail error: {e}")
            return None
