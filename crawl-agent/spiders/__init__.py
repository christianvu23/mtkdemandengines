"""Spiders package — all crawl spiders."""

from .base import BaseSpider
from .freelancer import VLanceSpider, FreelancerVNSpider, PeoplePerHourSpider
from .forum import BlackHatWorldSpider, WarriorForumSpider, VozMarketingSpider
from .social import TikTokSpider, FacebookGroupSpider

__all__ = [
    "BaseSpider",
    "VLanceSpider",
    "FreelancerVNSpider",
    "PeoplePerHourSpider",
    "BlackHatWorldSpider",
    "WarriorForumSpider",
    "VozMarketingSpider",
    "TikTokSpider",
    "FacebookGroupSpider",
]

# Registry: source_code → Spider class
SPIDER_REGISTRY = {
    "vlance": VLanceSpider,
    "freelancer_vn": FreelancerVNSpider,
    "peopleperhour": PeoplePerHourSpider,
    "bhw": BlackHatWorldSpider,
    "warriorforum": WarriorForumSpider,
    "voz_marketing": VozMarketingSpider,
    "tiktok_business": TikTokSpider,
    "fb_groups": FacebookGroupSpider,
}


def get_spider(source_code: str):
    """Get spider class by source code."""
    return SPIDER_REGISTRY.get(source_code)
