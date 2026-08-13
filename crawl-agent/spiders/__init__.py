"""Spiders package — all crawl spiders."""

from .base import BaseSpider
from .freelancer import (
    VLanceSpider,
    FreelancerVNSpider,
    PeoplePerHourSpider,
    # New spiders (Aug 2026) — from Vietnam freelancer scraping
    FastlanceSpider,
    VietGigsSpider,
    GigHitSpider,
    JobBoardVNSpider,
    JobsGoSpider,
    UpworkVNSpider,
    FreelancerComVNSpider,
    TruelancerVNSpider,
    BehanceVNSpider,
    ContraVNSpider,
    CareerVietSpider,
    TopCVSpider,
    Job123Spider,
)
from .forum import (
    BlackHatWorldSpider,
    WarriorForumSpider,
    VozMarketingSpider,
    # New forum spiders (Aug 2026)
    BrandsVietnamSpider,
    VietnamMarketingSpider,
)
from .social import TikTokSpider, FacebookGroupSpider

__all__ = [
    "BaseSpider",
    # Freelancer spiders
    "VLanceSpider",
    "FreelancerVNSpider",
    "PeoplePerHourSpider",
    "FastlanceSpider",
    "VietGigsSpider",
    "GigHitSpider",
    "JobBoardVNSpider",
    "JobsGoSpider",
    "UpworkVNSpider",
    "FreelancerComVNSpider",
    "TruelancerVNSpider",
    "BehanceVNSpider",
    "ContraVNSpider",
    "CareerVietSpider",
    "TopCVSpider",
    "Job123Spider",
    # Forum spiders
    "BlackHatWorldSpider",
    "WarriorForumSpider",
    "VozMarketingSpider",
    "BrandsVietnamSpider",
    "VietnamMarketingSpider",
    # Social spiders
    "TikTokSpider",
    "FacebookGroupSpider",
]

# Registry: source_code → Spider class
SPIDER_REGISTRY = {
    # ── Freelancer Sites ──────────────────────────────────────────
    "vlance": VLanceSpider,
    "freelancer_vn": FreelancerVNSpider,
    "peopleperhour": PeoplePerHourSpider,
    # New Vietnamese platforms (Aug 2026)
    "fastlance": FastlanceSpider,
    "vietgigs": VietGigsSpider,
    "gighit": GigHitSpider,
    "jobboard_vn": JobBoardVNSpider,
    "jobsgo": JobsGoSpider,
    # International platforms with VN market (Aug 2026)
    "upwork_vn": UpworkVNSpider,
    "freelancer_com_vn": FreelancerComVNSpider,
    "truelancer_vn": TruelancerVNSpider,
    "behance_vn": BehanceVNSpider,
    "contra_vn": ContraVNSpider,
    # Job boards with freelance marketing (Aug 2026)
    "careerviet": CareerVietSpider,
    "topcv": TopCVSpider,
    "123job": Job123Spider,
    # ── Forums / Communities ──────────────────────────────────────
    "bhw": BlackHatWorldSpider,
    "warriorforum": WarriorForumSpider,
    "voz_marketing": VozMarketingSpider,
    # New Vietnamese communities (Aug 2026)
    "brands_vietnam": BrandsVietnamSpider,
    "vn_marketing": VietnamMarketingSpider,
    # ── Social Media ──────────────────────────────────────────────
    "tiktok_business": TikTokSpider,
    "fb_groups": FacebookGroupSpider,
}


def get_spider(source_code: str):
    """Get spider class by source code."""
    return SPIDER_REGISTRY.get(source_code)
