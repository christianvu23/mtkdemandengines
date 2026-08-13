#!/usr/bin/env python3
"""
Test crawl với Scrapling Fetcher (fast mode) cho sites khong co Cloudflare.
"""

import sys
from pathlib import Path

# Create data directory
data_dir = Path(__file__).parent / "data"
data_dir.mkdir(exist_ok=True)


def test_fetcher(url, name):
    """Test URL with Scrapling Fetcher (fast mode)."""
    print("=" * 70)
    print(f"Testing {name}")
    print(f"URL: {url}")
    print("=" * 70)
    
    try:
        from scrapling.fetchers import Fetcher
        
        print("\n[1] Fetching with Fetcher (fast mode)...")
        page = Fetcher.get(
            url,
            stealthy_headers=True,
            impersonate="chrome",
            timeout=30,
        )
        
        html = str(page)
        status = getattr(page, 'status', 200)
        print(f"[OK] Status: {status}, Got {len(html)} characters")
        
        if status != 200:
            print(f"[WARN] Non-200 status, may be blocked")
            return False
        
        # Save HTML
        safe_name = name.replace(" ", "_").replace(".", "_").lower()
        output_file = data_dir / f"{safe_name}_sample.html"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"[OK] Saved to {output_file}")
        
        # Analyze structure
        print("\n[2] Analyzing HTML structure...")
        from scrapling.parser import Selector
        doc = Selector(html)
        
        links = doc.css('a')
        print(f"  Total links: {len(links)}")
        
        # Find relevant links based on URL patterns
        patterns = {
            '/du-an/': 'vLance jobs',
            '/threads/': 'Forum threads',
            '/thread/': 'Forum thread',
            '/projects/': 'Freelancer projects',
            '/jobs/': 'Job listings',
        }
        
        for pattern, desc in patterns.items():
            found = doc.css(f'a[href*="{pattern}"]')
            if found:
                print(f"  {desc} ({pattern}): {len(found)} links")
        
        # Show page title
        title = doc.css('title')
        if title and title[0].text:
            print(f"\n[3] Page title: {title[0].text.strip()[:80]}")
        
        # Show first 5 links with text
        print("\n[4] Sample links with text:")
        count = 0
        for link in links[:50]:
            href = link.attrib.get('href', '')
            text = link.text.strip() if link.text else ''
            if text and len(text) > 10 and href.startswith('http'):
                print(f"  - {text[:60]}")
                print(f"    {href[:80]}")
                count += 1
                if count >= 5:
                    break
        
        return True
        
    except Exception as e:
        print(f"\n[ERROR] {e}")
        return False


def main():
    """Run all tests."""
    print("\n" + "=" * 70)
    print("SCRAPLING FETCHER TEST (Fast Mode)")
    print("=" * 70)
    
    # Sites to test (ordered by expected difficulty)
    sites = [
        ("https://www.warriorforum.com/main-internet-marketing-discussion-forum/", "WarriorForum"),
        ("https://www.blackhatworld.com/seo/marketplace/", "BlackHatWorld"),
        ("https://www.peopleperhour.com/freelance-marketing-jobs", "PeoplePerHour"),
        ("https://www.freelancer.com/jobs/marketing/", "Freelancer.com"),
    ]
    
    results = {}
    
    for url, name in sites:
        results[name] = test_fetcher(url, name)
        print()
    
    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    
    for name, success in results.items():
        status = "OK" if success else "FAILED"
        print(f"  {name}: {status}")
    
    success_count = sum(1 for s in results.values() if s)
    print(f"\n  Success: {success_count}/{len(results)}")
    
    print("\n" + "=" * 70)
    print("NEXT STEPS:")
    print("1. Check HTML files in data/ directory")
    print("2. For successful sites: update CSS selectors")
    print("3. For failed sites: try stealth mode or different approach")
    print("=" * 70)


if __name__ == "__main__":
    main()
