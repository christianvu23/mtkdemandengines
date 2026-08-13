"""
Crawl Agent Orchestrator — Coordinates all spiders and engines.
================================================================
Main entry point for running the hybrid Scrapling + Camoufox crawl agent.
Supports: single source, all sources, scheduled runs, and API-triggered runs.
"""

import asyncio
import json
import sys
from datetime import datetime
from pathlib import Path
from loguru import logger

from config import Config
from engines.scrapling_engine import ScraplingEngine
from engines.camoufox_engine import CamoufoxEngine
from utils.workers_client import WorkersClient
from utils import baseline as baseline_mod
from utils import circuit_breaker as circuit_mod
from spiders import (
    SPIDER_REGISTRY,
    VLanceSpider,
    FreelancerVNSpider,
    PeoplePerHourSpider,
    # New freelancer spiders (Aug 2026)
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
    # Forum spiders
    BlackHatWorldSpider,
    WarriorForumSpider,
    VozMarketingSpider,
    # New forum spiders (Aug 2026)
    BrandsVietnamSpider,
    VietnamMarketingSpider,
    # Social spiders
    TikTokSpider,
    FacebookGroupSpider,
)


class CrawlOrchestrator:
    """
    Central orchestrator for the hybrid crawl agent.
    Manages engine lifecycle, spider execution, and result aggregation.
    """

    def __init__(self):
        self.config = Config()
        self.scrapling = ScraplingEngine(proxy=self.config.HTTP_PROXY)
        self.camoufox: CamoufoxEngine | None = None
        self.workers = WorkersClient()
        self._results: list[dict] = []
        self._circuit_state = circuit_mod.load_state()
        self._baseline = baseline_mod.load_baseline()
        self.degraded_sources: list[dict] = []

    async def _init_camoufox(self):
        """Lazy-init Camoufox only when needed (resource-heavy)."""
        if self.camoufox is None:
            self.camoufox = CamoufoxEngine(
                headless=self.config.CAMOUFOX_HEADLESS,
                os_type=self.config.CAMOUFOX_OS,
                fingerprint_preset=self.config.CAMOUFOX_FINGERPRINT_PRESET,
                block_ads=self.config.CAMOUFOX_BLOCK_ADS,
                proxy=self.config.HTTP_PROXY,
            )

    async def close(self):
        """Cleanup all engines."""
        if self.camoufox:
            await self.camoufox.close()
        await self.workers.close()

    # ── Run single spider ────────────────────────────────────────
    async def run_spider(
        self,
        source_code: str,
        max_pages: int = 3,
        max_details: int = 20,
        submit: bool = True,
        force: bool = False,
    ) -> dict:
        """
        Run a single spider by source code.
        Returns stats dict with crawl results.
        """
        spider_cls = SPIDER_REGISTRY.get(source_code)
        if not spider_cls:
            return {"error": f"Unknown source: {source_code}", "available": list(SPIDER_REGISTRY.keys())}

        # Circuit breaker: nguồn thất bại liên tục thì tạm dừng, đừng hammer
        if not force and circuit_mod.is_open(
            self._circuit_state, source_code, self.config.CIRCUIT_MAX_FAILURES
        ):
            entry = self._circuit_state.get(source_code, {})
            logger.warning(
                f"⚡ Circuit OPEN cho '{source_code}' — bỏ qua "
                f"({entry.get('failures_in_a_row')} run lỗi liên tiếp, "
                f"lần cuối: {entry.get('last_failure_at')}). Dùng force=True để ép chạy."
            )
            return {
                "source": source_code,
                "circuit_open": True,
                "skipped": True,
                "error": "Circuit breaker mở — nguồn đang thất bại liên tục",
            }

        # Init Camoufox if this spider needs it
        source_config = None
        for s in Config.get_all_sources():
            if s["code"] == source_code:
                source_config = s
                break

        if source_config and source_config["engine"] == "camoufox":
            await self._init_camoufox()

        # Create spider instance
        spider = spider_cls(
            scrapling=self.scrapling,
            camoufox=self.camoufox,
            workers=self.workers,
        )

        # Get URLs from config
        urls = source_config["urls"] if source_config else []
        if not urls:
            return {"error": f"No URLs configured for {source_code}"}

        # Run crawl
        stats = await spider.crawl(
            start_urls=urls,
            max_pages=max_pages,
            max_details=max_details,
            delay=self.config.CRAWL_DELAY_SECONDS,
            submit=submit,
        )

        self._results.append(stats)
        self._record_health(source_code, stats)
        return stats

    def _record_health(self, source_code: str, stats: dict) -> None:
        """
        Cập nhật circuit breaker + baseline sau mỗi run.
        Circuit: quan tâm "có fetch được không". Baseline: quan tâm
        "có trích được link không". Hai câu hỏi khác nhau, hai cơ chế khác nhau.
        """
        fetch_ok = stats.get("pages_fetched", 0) > 0
        self._circuit_state = circuit_mod.record_run(self._circuit_state, source_code, fetch_ok)
        circuit_mod.save_state(self._circuit_state)

        if circuit_mod.is_open(self._circuit_state, source_code, self.config.CIRCUIT_MAX_FAILURES):
            logger.error(
                f"🚨 Circuit breaker MỞ cho '{source_code}' — sẽ bị bỏ qua các run sau "
                f"cho tới khi có run thành công hoặc xoá state. CẦN NGƯỜI XEM."
            )

        new_baseline, status = baseline_mod.update_baseline(self._baseline, source_code, stats)
        self._baseline = new_baseline
        baseline_mod.save_baseline(self._baseline)

        if status == "degraded":
            entry = self._baseline[source_code]
            logger.warning(
                f"📉 '{source_code}' DEGRADED: từng ra {entry['last_good_links']} links, "
                f"nay {entry['zero_streak']} run liên tiếp ra 0. "
                f"Khả năng cao selector hỏng hoặc bị chặn — CẦN NGƯỜI XEM."
            )
            self.degraded_sources.append({
                "source": source_code,
                "last_good_links": entry["last_good_links"],
                "zero_streak": entry["zero_streak"],
                "parse_confidence": stats.get("parse_confidence", 0.0),
            })

    # ── Run all spiders ──────────────────────────────────────────
    async def run_all(
        self,
        max_pages: int = 3,
        max_details: int = 20,
        submit: bool = True,
        engines: list[str] | None = None,
    ) -> dict:
        """
        Run all enabled spiders.
        engines: filter by engine type ["scrapling_fast", "scrapling_stealth", "camoufox"]
        """
        start_time = datetime.now()
        all_stats = []

        sources = Config.get_all_sources()
        if engines:
            sources = [s for s in sources if s["engine"] in engines]

        logger.info(f"🚀 Starting crawl agent — {len(sources)} sources to process")

        # Phase 1: Scrapling spiders (can run concurrently)
        scrapling_sources = [s for s in sources if s["engine"].startswith("scrapling")]
        camoufox_sources = [s for s in sources if s["engine"] == "camoufox"]

        if scrapling_sources:
            logger.info(f"📡 Phase 1: Running {len(scrapling_sources)} Scrapling spiders")
            tasks = []
            for source in scrapling_sources:
                tasks.append(self.run_spider(
                    source["code"],
                    max_pages=max_pages,
                    max_details=max_details,
                    submit=submit,
                ))

            results = await asyncio.gather(*tasks, return_exceptions=True)
            for i, r in enumerate(results):
                if isinstance(r, Exception):
                    all_stats.append({"source": scrapling_sources[i]["code"], "error": str(r)})
                else:
                    all_stats.append(r)

        # Phase 2: Camoufox spiders (sequential — single browser instance)
        if camoufox_sources:
            logger.info(f"🦊 Phase 2: Running {len(camoufox_sources)} Camoufox spiders")
            await self._init_camoufox()

            for source in camoufox_sources:
                try:
                    stats = await self.run_spider(
                        source["code"],
                        max_pages=max_pages,
                        max_details=max_details,
                        submit=submit,
                    )
                    all_stats.append(stats)
                except Exception as e:
                    all_stats.append({"source": source["code"], "error": str(e)})

        # Summary
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()

        summary = {
            "started_at": start_time.isoformat(),
            "finished_at": end_time.isoformat(),
            "duration_seconds": round(duration, 1),
            "total_sources": len(sources),
            "successful": sum(1 for s in all_stats if "error" not in s),
            "failed": sum(1 for s in all_stats if "error" in s),
            "circuit_open": sum(1 for s in all_stats if s.get("circuit_open")),
            "total_leads_extracted": sum(s.get("leads_extracted", 0) for s in all_stats),
            "total_leads_submitted": sum(s.get("leads_submitted", 0) for s in all_stats),
            "degraded_sources": self.degraded_sources,
            "details": all_stats,
        }

        logger.info(
            f"✅ Crawl complete in {duration:.1f}s — "
            f"{summary['total_leads_submitted']} leads submitted "
            f"({summary['successful']}/{summary['total_sources']} sources OK)"
        )
        if self.degraded_sources:
            logger.warning(
                f"📉 {len(self.degraded_sources)} nguồn DEGRADED "
                f"(0 link dù từng có dữ liệu): {[d['source'] for d in self.degraded_sources]}"
            )

        return summary

    # ── Run social media spiders only ────────────────────────────
    async def run_social(
        self,
        submit: bool = True,
        tiktok_queries: list[str] | None = None,
    ) -> dict:
        """
        Run only social media spiders (TikTok + Facebook).
        These need Camoufox and are the most resource-intensive.
        """
        await self._init_camoufox()
        results = {}

        # TikTok
        logger.info("🎵 Running TikTok spider")
        tiktok = TikTokSpider(
            scrapling=self.scrapling,
            camoufox=self.camoufox,
            workers=self.workers,
        )
        results["tiktok"] = await tiktok.crawl_search_queries(
            queries=tiktok_queries,
            submit=submit,
        )

        # Facebook
        logger.info("📘 Running Facebook Groups spider")
        fb = FacebookGroupSpider(
            scrapling=self.scrapling,
            camoufox=self.camoufox,
            workers=self.workers,
        )
        results["facebook"] = await fb.crawl_groups(submit=submit)

        return results

    # ── Health check ─────────────────────────────────────────────
    async def health_check(self) -> dict:
        """Check all systems are operational."""
        checks = {}

        # Workers API
        checks["workers_api"] = await self.workers.health_check()

        # Scrapling (quick test)
        try:
            result = await self.scrapling.fetch("https://example.com", engine="fast")
            checks["scrapling_fast"] = {"ok": result["ok"]}
        except Exception as e:
            checks["scrapling_fast"] = {"ok": False, "error": str(e)}

        # Camoufox (only if enabled)
        if self.config.ENABLE_SOCIAL_MEDIA:
            try:
                await self._init_camoufox()
                checks["camoufox"] = {"ok": True, "status": "initialized"}
            except Exception as e:
                checks["camoufox"] = {"ok": False, "error": str(e)}

        checks["sources_configured"] = len(Config.get_all_sources())
        checks["timestamp"] = datetime.now().isoformat()

        return checks

    # ── Save results to file ─────────────────────────────────────
    def save_results(self, output_dir: str = "data") -> str:
        """Save crawl results to JSON file."""
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = output_path / f"crawl_results_{timestamp}.json"

        with open(filename, "w", encoding="utf-8") as f:
            json.dump(self._results, f, ensure_ascii=False, indent=2, default=str)

        logger.info(f"💾 Results saved to {filename}")
        return str(filename)


# ── CLI Entry Point ──────────────────────────────────────────────

async def main():
    """CLI entry point for the crawl agent."""
    import argparse

    parser = argparse.ArgumentParser(description="MTK Demand Engines — Crawl Agent")
    parser.add_argument("command", choices=["run", "run-all", "run-social", "health", "list"],
                        help="Command to run")
    parser.add_argument("--source", "-s", type=str, help="Source code to crawl (for 'run' command)")
    parser.add_argument("--max-pages", type=int, default=3, help="Max listing pages per source")
    parser.add_argument("--max-details", type=int, default=20, help="Max detail pages per source")
    parser.add_argument("--no-submit", action="store_true", help="Don't submit to Workers API")
    parser.add_argument("--force", action="store_true", help="Bỏ qua circuit breaker, ép chạy nguồn đang bị chặn")
    parser.add_argument("--engines", type=str, help="Comma-separated engine filter")
    parser.add_argument("--output", "-o", type=str, help="Output directory for results")

    args = parser.parse_args()

    # Setup logging
    logger.remove()
    logger.add(sys.stderr, level=Config.LOG_LEVEL, format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | {message}")
    if Config.LOG_FILE:
        logger.add(Config.LOG_FILE, level="DEBUG", rotation="10 MB")

    orchestrator = CrawlOrchestrator()

    try:
        if args.command == "list":
            sources = Config.get_all_sources()
            print(f"\n📋 Configured sources ({len(sources)}):")
            print("-" * 60)
            for s in sources:
                print(f"  [{s['engine']:16s}] {s['code']:16s} — {s['name']}")
                for url in s.get("urls", []):
                    print(f"  {'':16s} {'':16s}   {url}")
            print()

        elif args.command == "health":
            result = await orchestrator.health_check()
            print(json.dumps(result, indent=2, ensure_ascii=False))

        elif args.command == "run":
            if not args.source:
                print("Error: --source required for 'run' command")
                sys.exit(1)
            result = await orchestrator.run_spider(
                args.source,
                max_pages=args.max_pages,
                max_details=args.max_details,
                submit=not args.no_submit,
                force=args.force,
            )
            print(json.dumps(result, indent=2, ensure_ascii=False, default=str))

        elif args.command == "run-all":
            engines = args.engines.split(",") if args.engines else None
            result = await orchestrator.run_all(
                max_pages=args.max_pages,
                max_details=args.max_details,
                submit=not args.no_submit,
                engines=engines,
            )
            print(json.dumps(result, indent=2, ensure_ascii=False, default=str))

            if args.output:
                orchestrator.save_results(args.output)

        elif args.command == "run-social":
            result = await orchestrator.run_social(submit=not args.no_submit)
            print(json.dumps(result, indent=2, ensure_ascii=False, default=str))

    finally:
        await orchestrator.close()


if __name__ == "__main__":
    asyncio.run(main())
