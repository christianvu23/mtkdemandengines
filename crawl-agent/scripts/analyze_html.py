#!/usr/bin/env python3
"""
HTML Structure Analyzer — Fetch real HTML and analyze DOM structure.
====================================================================
Mục đích: Xem HTML thật của các sites để update CSS selectors.
Chạy script này TRƯỚC khi viết spider chính thức.
"""

import asyncio
import sys
from pathlib import Path
from urllib.parse import urlparse

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))


async def analyze_url(url: str, name: str = "") -> dict:
    """Fetch URL and analyze HTML structure."""
    print(f"\n{'='*70}")
    print(f"Analyzing: {name or url}")
    print(f"URL: {url}")
    print(f"{'='*70}")

    try:
        # Try with Scrapling Stealth (bypasses Cloudflare)
        from scrapling.fetchers import StealthyFetcher

        print("\n[1] Fetching with Scrapling Stealth...")
        page = StealthyFetcher.fetch(
            url,
            headless=True,
            solve_cloudflare=True,
            network_idle=True,
            timeout=45000,
        )

        html = str(page)
        print(f"✓ Fetched {len(html)} characters")

        # Analyze structure
        print("\n[2] Analyzing HTML structure...")

        from scrapling.parser import Selector
        doc = Selector(html)

        # Find all links
        all_links = doc.css("a[href]")
        print(f"  Total links: {len(all_links)}")

        # Find potential job/post cards
        card_patterns = [
            ".project-card", ".job-card", ".listing-item", "article",
            "[class*='project']", "[class*='job']", "[class*='listing']",
            "[class*='thread']", "[class*='post']",
        ]

        print("\n[3] Potential card selectors:")
        for pattern in card_patterns:
            matches = doc.css(pattern)
            if matches:
                print(f"  {pattern}: {len(matches)} matches")

        # Find links with specific patterns
        print("\n[4] Link patterns (for job/post URLs):")
        link_patterns = {
            "vLance /du-an/": "a[href*='/du-an/']",
            "Freelancer /projects/": "a[href*='/projects/']",
            "BHW /threads/": "a[href*='/threads/']",
            "Warrior /thread/": "a[href*='/thread/']",
            "VOZ /t/": "a[href*='/t/']",
        }

        for name, selector in link_patterns.items():
            matches = doc.css(selector)
            if matches:
                print(f"  {name}: {len(matches)} links")
                # Show first 3 examples
                for i, link in enumerate(matches[:3]):
                    href = link.attrib.get("href", "")
                    text = link.text.strip()[:50] if link.text else ""
                    print(f"    [{i+1}] {href}")
                    if text:
                        print(f"        Text: {text}")

        # Extract page title
        title = doc.css("title")
        if title:
            print(f"\n[5] Page title: {title[0].text}")

        # Save HTML for manual inspection
        output_dir = Path(__file__).parent.parent / "data" / "html_samples"
        output_dir.mkdir(parents=True, exist_ok=True)

        domain = urlparse(url).netloc.replace(".", "_")
        output_file = output_dir / f"{domain}_sample.html"
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"\n[6] HTML saved to: {output_file}")

        return {
            "ok": True,
            "url": url,
            "html_length": len(html),
            "total_links": len(all_links),
            "html_file": str(output_file),
        }

    except Exception as e:
        print(f"\n✗ Error: {e}")
        return {"ok": False, "url": url, "error": str(e)}


async def main():
    """Analyze all target sites."""
    print("\n" + "="*70)
    print("HTML STRUCTURE ANALYZER")
    print("Fetch real HTML to verify CSS selectors")
    print("="*70)

    # Target sites (priority order)
    sites = [
        {
            "name": "vLance.vn (Marketing)",
            "url": "https://vlance.vn/viec-lam-freelance/marketing",
        },
        {
            "name": "BlackHatWorld Marketplace",
            "url": "https://www.blackhatworld.com/seo/marketplace/",
        },
        {
            "name": "WarriorForum",
            "url": "https://www.warriorforum.com/main-internet-marketing-discussion-forum/",
        },
    ]

    results = []
    for site in sites:
        result = await analyze_url(site["url"], site["name"])
        results.append(result)

        # Delay between sites
        await asyncio.sleep(2)

    # Summary
    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70)

    for r in results:
        status = "✓" if r.get("ok") else "✗"
        name = urlparse(r["url"]).netloc
        if r.get("ok"):
            print(f"{status} {name}: {r['html_length']} chars, {r['total_links']} links")
        else:
            print(f"{status} {name}: {r.get('error', 'Unknown error')}")

    print("\n" + "="*70)
    print("NEXT STEPS:")
    print("1. Check saved HTML files in data/html_samples/")
    print("2. Identify correct CSS selectors from real DOM")
    print("3. Update spiders/freelancer.py and spiders/forum.py")
    print("4. Re-run tests to verify")
    print("="*70)


if __name__ == "__main__":
    asyncio.run(main())
