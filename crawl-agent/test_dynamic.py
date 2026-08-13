#!/usr/bin/env python3
"""
Test crawl với Scrapling DynamicFetcher (có JS rendering).
"""

import sys
from pathlib import Path

# Create data directory
data_dir = Path(__file__).parent / "data"
data_dir.mkdir(exist_ok=True)


def test_dynamic(url, name):
    """Test URL with Scrapling DynamicFetcher (JS rendering)."""
    print("=" * 70)
    print(f"Testing {name}")
    print(f"URL: {url}")
    print("=" * 70)
    
    try:
        from scrapling.fetchers import DynamicFetcher
        
        print("\n[1] Fetching with DynamicFetcher (JS rendering)...")
        page = DynamicFetcher.fetch(
            url,
            headless=True,
            network_idle=True,
            timeout=45000,
        )
        
        html = str(page)
        print(f"[OK] Got {len(html)} characters")
        
        # Save HTML
        safe_name = name.replace(" ", "_").replace(".", "_").lower()
        output_file = data_dir / f"{safe_name}_dynamic.html"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"[OK] Saved to {output_file}")
        
        # Analyze structure
        print("\n[2] Analyzing HTML structure...")
        from scrapling.parser import Selector
        doc = Selector(html)
        
        links = doc.css('a')
        print(f"  Total links: {len(links)}")
        
        # Find relevant links
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
        for link in links[:100]:
            href = link.attrib.get('href', '')
            text = link.text.strip() if link.text else ''
            if text and len(text) > 10 and (href.startswith('http') or href.startswith('/')):
                print(f"  - {text[:60]}")
                print(f"    {href[:80]}")
                count += 1
                if count >= 5:
                    break
        
        if count == 0:
            print("  (no links with text found)")
        
        return True
        
    except Exception as e:
        print(f"\n[ERROR] {e}")
        return False


def main():
    """Run all tests."""
    print("\n" + "=" * 70)
    print("SCRAPLING DYNAMIC FETCHER TEST (JS Rendering)")
    print("=" * 70)
    
    # Sites to test
    sites = [
        ("https://www.warriorforum.com/main-internet-marketing-discussion-forum/", "WarriorForum"),
        ("https://www.peopleperhour.com/freelance-marketing-jobs", "PeoplePerHour"),
        ("https://www.freelancer.com/jobs/marketing/", "Freelancer.com"),
    ]
    
    results = {}
    
    for url, name in sites:
        results[name] = test_dynamic(url, name)
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
    print("2. Update CSS selectors based on real DOM")
    print("3. Run full crawl with updated selectors")
    print("=" * 70)


if __name__ == "__main__":
    main()
