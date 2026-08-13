#!/usr/bin/env python3
"""
MTK Demand Engines — Crawl Agent Entry Point
=============================================
Hybrid Scrapling + Camoufox agent for crawling job opportunities
from freelancer sites, marketing forums, and social media.

Usage:
    python main.py list                          # List configured sources
    python main.py health                        # Check system health
    python main.py run -s vlance                 # Run single spider
    python main.py run-all                       # Run all enabled spiders
    python main.py run-all --engines scrapling_stealth  # Filter by engine
    python main.py run-social                    # Run social media only (Camoufox)
    python main.py run-all --no-submit           # Dry run (don't submit to API)
    python main.py run-all -o data               # Save results to file
"""

import asyncio
import sys
from orchestrator import main

if __name__ == "__main__":
    asyncio.run(main())
