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
        # ── Vietnamese Freelancer Platforms ───────────────────────
        {
            "code": "vlance",
            "name": "vLance.vn",
            "engine": "scrapling_stealth",  # vLance blocks non-browser
            "urls": [
                "https://www.vlance.vn/viec-lam-freelance/marketing",
                "https://www.vlance.vn/viec-lam-freelance/online-marketing",
                "https://www.vlance.vn/viec-lam-freelance/content",
            ],
            "search_queries": ["marketing", "branding", "thiet ke", "content", "chay ads"],
            "regex_link_bai": r"/du-an/[\w-]+\d+",
        },
        {
            "code": "freelancer_vn",
            "name": "FreelancerViet.vn",
            "engine": "scrapling_stealth",
            "urls": [
                "https://freelancerviet.vn/viec-lam-freelance/marketing",
                "https://freelancerviet.vn/viec-lam-freelance/content",
            ],
            "search_queries": ["marketing campaign", "TVC", "branding", "chay quang cao facebook"],
        },
        {
            "code": "fastlance",
            "name": "Fastlance.vn",
            "engine": "scrapling_stealth",
            "urls": [
                "https://fastlance.vn/dich-vu/marketing",
                "https://fastlance.vn/dich-vu/online-marketing",
            ],
            "search_queries": ["marketing", "branding", "content", "SEO", "chay ads"],
        },
        {
            "code": "vietgigs",
            "name": "VietGigs.vn",
            "engine": "scrapling_stealth",
            "urls": [
                "https://vietgigs.vn/gigs/social-media-ads",
                "https://vietgigs.vn/gigs/tvc-video",
                "https://vietgigs.vn/gigs/content-writing",
            ],
            "search_queries": ["social media ads", "TVC", "video production", "content marketing"],
        },
        {
            "code": "gighit",
            "name": "GigHit.vn",
            "engine": "scrapling_stealth",
            "urls": [
                "https://gighit.vn/gigs/marketing",
                "https://gighit.vn/gigs/design",
            ],
            "search_queries": ["marketing", "branding", "content", "thiet ke"],
        },
        {
            "code": "jobboard_vn",
            "name": "JobBoard.vn",
            "engine": "scrapling_fast",
            "urls": [
                "https://www.jobboard.vn/viec-lam/marketing",
                "https://www.jobboard.vn/viec-lam/freelance",
            ],
            "search_queries": ["marketing freelance", "content", "branding"],
        },
        {
            "code": "jobsgo",
            "name": "JobsGo.vn",
            "engine": "scrapling_fast",
            "urls": [
                "https://jobsgo.vn/viec-lam/marketing",
                "https://jobsgo.vn/viec-lam/google-ads",
            ],
            "search_queries": ["freelancer google ads", "marketing remote"],
        },
        # ── International Platforms (Vietnam Market) ──────────────
        {
            "code": "upwork_vn",
            "name": "Upwork Vietnam",
            "engine": "scrapling_fast",
            "urls": [
                "https://www.upwork.com/hire/marketing-consultants/vietnam/",
                "https://www.upwork.com/hire/digital-marketers/vietnam/",
                "https://www.upwork.com/hire/branding-freelancers/vietnam/",
            ],
            "search_queries": ["marketing consultant", "digital marketing", "branding", "social media"],
        },
        {
            "code": "freelancer_com_vn",
            "name": "Freelancer.com Vietnam",
            "engine": "scrapling_fast",
            "urls": [
                "https://www.freelancer.com/freelancers/vietnam/marketing",
                "https://www.freelancer.com/jobs/vietnam/marketing/",
            ],
            "search_queries": ["digital marketing", "SEO", "social media", "lead generation"],
        },
        {
            "code": "truelancer_vn",
            "name": "Truelancer Vietnam",
            "engine": "scrapling_fast",
            "urls": [
                "https://www.truelancer.com/freelance-marketing-jobs-in-vietnam",
                "https://www.truelancer.com/freelance-video-production-jobs-in-vietnam",
            ],
            "search_queries": ["digital marketing", "video production", "branding"],
        },
        {
            "code": "behance_vn",
            "name": "Behance Vietnam",
            "engine": "scrapling_fast",
            "urls": [
                "https://www.behance.net/search/projects?field=brand-design&location=VN",
            ],
            "search_queries": ["brand design", "visual identity", "creative direction"],
        },
        {
            "code": "contra_vn",
            "name": "Contra.com Vietnam",
            "engine": "scrapling_fast",
            "urls": [
                "https://contra.com/discover?category=brand-design&location=vietnam",
            ],
            "search_queries": ["brand design", "visual identity", "marketing"],
        },
        {
            "code": "peopleperhour",
            "name": "PeoplePerHour",
            "engine": "scrapling_fast",
            "urls": ["https://www.peopleperhour.com/freelance-marketing-jobs"],
            "search_queries": ["marketing agency", "social media management"],
        },
        # ── Job Boards with Freelance Marketing ───────────────────
        {
            "code": "careerviet",
            "name": "CareerViet.vn",
            "engine": "scrapling_fast",
            "urls": [
                "https://careerviet.vn/viec-lam/Freelancer-k-vi.html",
                "https://careerviet.vn/viec-lam/Digital-Marketing-k-vi.html",
            ],
            "search_queries": ["digital marketing freelancer", "content marketing", "social media"],
        },
        {
            "code": "topcv",
            "name": "TopCV.vn",
            "engine": "scrapling_fast",
            "urls": [
                "https://www.topcv.vn/tim-viec-lam/marketing-freelancer",
            ],
            "search_queries": ["marketing freelancer", "content", "branding"],
        },
        {
            "code": "123job",
            "name": "123Job.vn",
            "engine": "scrapling_fast",
            "urls": [
                "https://123job.vn/viec-lam/freelancer-marketing",
                "https://123job.vn/viec-lam/facebook-marketing-freelancer",
                "https://123job.vn/viec-lam/google-ads-freelancer",
            ],
            "search_queries": ["facebook marketing", "google ads", "content"],
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
        # ── Vietnamese Marketing Communities ──────────────────────
        {
            "code": "brands_vietnam",
            "name": "Brands Vietnam",
            "engine": "scrapling_fast",
            "urls": [
                "https://www.brandsvietnam.com/cong-dong",
                "https://www.brandsvietnam.com/dien-dan",
            ],
            "search_queries": [
                "cần agency", "tìm freelancer marketing", "chiến dịch branding",
                "tuyển marketing", "cần chạy ads", "TVC quảng cáo",
            ],
        },
        {
            "code": "vn_marketing",
            "name": "VietnamMarketing.com.vn",
            "engine": "scrapling_fast",
            "urls": [
                "https://vietnammarketing.com.vn/dien-dan/",
                "https://vietnammarketing.com.vn/hoi-dap/",
            ],
            "search_queries": [
                "tìm người làm marketing", "thuê freelancer", "cần quản trị fanpage",
                "chạy quảng cáo", "chiến dịch marketing",
            ],
        },
    ]

    SOCIAL_SOURCES = [
        {
            "code": "tiktok_business",
            "name": "TikTok Business",
            "engine": "camoufox",  # Heavy anti-bot
            "urls": ["https://www.tiktok.com/search?q=marketing+agency+needed"],
            "search_queries": [
                "cần marketing", "tìm agency", "chạy ads tiktok",
                "cần làm TVC", "tìm freelancer branding",
            ],
            "fingerprint": {"os": "windows", "locale": "vi-VN"},
        },
        {
            "code": "fb_groups",
            "name": "Facebook Groups",
            "engine": "camoufox",  # Very heavy anti-bot
            "urls": [
                # ── Groups discovered from scraping ──────────────
                "https://www.facebook.com/groups/374012657716290",  # Cộng Đồng Marketing Freelancer VN
                "https://www.facebook.com/groups/vlance/",  # Freelancer Thiết kế, Online Marketing, Copywriting
                "https://www.facebook.com/groups/congdongmarketing",  # Cộng Đồng Marketing
                "https://www.facebook.com/groups/digitalmarketingvn",  # Digital Marketing VN
                "https://www.facebook.com/groups/MarketingOnlineVietNam",  # Marketing Online VN
            ],
            "search_queries": [
                "cần tìm agency", "tìm người làm marketing", "cần chạy ads",
                "tìm freelancer marketing", "cần làm TVC", "cần quản trị fanpage",
                "thuê freelancer branding", "tìm người chạy quảng cáo",
            ],
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
