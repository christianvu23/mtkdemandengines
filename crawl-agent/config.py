"""
Crawl Agent Configuration
=========================
Central configuration for the hybrid Scrapling + Camoufox crawl agent.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root
_env_path = Path(__file__).parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path)


class Config:
    """Agent configuration — all settings from env or defaults."""

    # ── Workers API ──────────────────────────────────────────────
    WORKERS_API_URL: str = os.getenv("WORKERS_API_URL", "https://mtkdemandengines.christianvu23.workers.dev")
    WORKERS_DEMAND_TOKEN: str = os.getenv("WORKERS_DEMAND_TOKEN", "")

    # ── Camoufox ─────────────────────────────────────────────────
    CAMOUFOX_HEADLESS: bool = os.getenv("CAMOUFOX_HEADLESS", "true").lower() == "true"
    CAMOUFOX_OS: str = os.getenv("CAMOUFOX_OS", "windows")
    CAMOUFOX_FINGERPRINT_PRESET: bool = os.getenv("CAMOUFOX_FINGERPRINT_PRESET", "true").lower() == "true"
    CAMOUFOX_BLOCK_ADS: bool = os.getenv("CAMOUFOX_BLOCK_ADS", "true").lower() == "true"

    # ── Crawl behavior ──────────────────────────────────────────
    CRAWL_CONCURRENCY: int = int(os.getenv("CRAWL_CONCURRENCY", "5"))
    CRAWL_DELAY_SECONDS: float = float(os.getenv("CRAWL_DELAY_SECONDS", "3"))
    CRAWL_MAX_RETRIES: int = int(os.getenv("CRAWL_MAX_RETRIES", "3"))

    # ── Source toggles ───────────────────────────────────────────
    ENABLE_FREELANCER_SITES: bool = os.getenv("ENABLE_FREELANCER_SITES", "true").lower() == "true"
    ENABLE_MARKETING_FORUMS: bool = os.getenv("ENABLE_MARKETING_FORUMS", "true").lower() == "true"
    ENABLE_SOCIAL_MEDIA: bool = os.getenv("ENABLE_SOCIAL_MEDIA", "false").lower() == "true"

    # ── Proxy (optional) ─────────────────────────────────────────
    HTTP_PROXY: str | None = os.getenv("HTTP_PROXY")
    SOCKS_PROXY: str | None = os.getenv("SOCKS_PROXY")

    # ── Logging ──────────────────────────────────────────────────
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE: str = os.getenv("LOG_FILE", "crawl-agent.log")

    # ── Source definitions ───────────────────────────────────────
    # Each source: { code, name, engine, urls, transport, ... }
    # engine: "scrapling_fast" | "scrapling_stealth" | "camoufox"
    FREELANCER_SOURCES = [
        {
            "code": "vlance",
            "name": "vLance.vn",
            "engine": "scrapling_stealth",  # vLance blocks non-browser
            "urls": ["https://vlance.vn/viec-lam-freelance/marketing"],
            "search_queries": ["marketing", "branding", "thiet ke", "content"],
            "regex_link_bai": r"/du-an/[\w-]+\d+",
        },
        {
            "code": "freelancer_vn",
            "name": "Freelancer.vn",
            "engine": "scrapling_stealth",
            "urls": ["https://www.freelancer.vn/projects/marketing/"],
            "search_queries": ["marketing campaign", "TVC", "branding"],
        },
        {
            "code": "peopleperhour",
            "name": "PeoplePerHour",
            "engine": "scrapling_fast",
            "urls": ["https://www.peopleperhour.com/freelance-marketing-jobs"],
            "search_queries": ["marketing agency", "social media management"],
        },
    ]

    FORUM_SOURCES = [
        {
            "code": "bhw",
            "name": "BlackHatWorld",
            "engine": "scrapling_fast",
            "urls": [
                "https://www.blackhatworld.com/seo/marketplace/",
                "https://www.blackhatworld.com/forums/social-media/",
            ],
            "search_queries": ["looking for marketing", "need agency", "TVC production"],
        },
        {
            "code": "warriorforum",
            "name": "WarriorForum",
            "engine": "scrapling_fast",
            "urls": [
                "https://www.warriorforum.com/main-internet-marketing-discussion-forum/",
                "https://www.warriorforum.com/ask-me-anything/",
            ],
            "search_queries": ["need help with marketing", "looking for marketer"],
        },
        {
            "code": "voz_marketing",
            "name": "VOZ Marketing",
            "engine": "scrapling_stealth",
            "urls": ["https://voz.vn/f/marketing-PR.34/"],
            "search_queries": ["cần agency", "tìm người chạy ads", "cần làm TVC"],
        },
    ]

    SOCIAL_SOURCES = [
        {
            "code": "tiktok_business",
            "name": "TikTok Business",
            "engine": "camoufox",  # Heavy anti-bot
            "urls": ["https://www.tiktok.com/search?q=marketing+agency+needed"],
            "search_queries": ["cần marketing", "tìm agency", "chạy ads tiktok"],
            "fingerprint": {"os": "windows", "locale": "vi-VN"},
        },
        {
            "code": "fb_groups",
            "name": "Facebook Groups",
            "engine": "camoufox",  # Very heavy anti-bot
            "urls": [
                "https://www.facebook.com/groups/congdongmarketing",
                "https://www.facebook.com/groups/digitalmarketingvn",
            ],
            "search_queries": ["cần tìm agency", "tìm người làm marketing", "cần chạy ads"],
            "fingerprint": {"os": "macos", "locale": "vi-VN"},
        },
    ]

    @classmethod
    def get_all_sources(cls) -> list[dict]:
        """Return all enabled sources."""
        sources = []
        if cls.ENABLE_FREELANCER_SITES:
            sources.extend(cls.FREELANCER_SOURCES)
        if cls.ENABLE_MARKETING_FORUMS:
            sources.extend(cls.FORUM_SOURCES)
        if cls.ENABLE_SOCIAL_MEDIA:
            sources.extend(cls.SOCIAL_SOURCES)
        return sources

    @classmethod
    def get_sources_by_engine(cls, engine: str) -> list[dict]:
        """Filter sources by engine type."""
        return [s for s in cls.get_all_sources() if s["engine"] == engine]
