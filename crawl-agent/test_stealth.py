#!/usr/bin/env python3
"""
Test crawl với Scrapling Stealth để bypass anti-bot.
Chạy sync (không dùng asyncio).
"""

import sys
from pathlib import Path

# Create data directory
data_dir = Path(__file__).parent / "data"
data_dir.mkdir(exist_ok=True)


def test_vlance():
    """Test vLance.vn với Scrapling Stealth."""
    print("=" * 70)
    print("Testing vLance.vn with Scrapling Stealth")
    print("=" * 70)
    
    try:
        from scrapling.fetchers import StealthyFetcher
        
        print("\n[1] Fetching vLance.vn...")
        page = StealthyFetcher.fetch(
            'https://vlance.vn/viec-lam-freelance/marketing',
            headless=True,
            solve_cloudflare=True,
            network_idle=True,
            timeout=45000,
        )
        
        html = str(page)
        print(f"[OK] Got {len(html)} characters")
        
        # Save HTML
        output_file = data_dir / "vlance_sample.html"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"[OK] Saved to {output_file}")
        
        # Analyze structure
        print("\n[2] Analyzing HTML structure...")
        from scrapling.parser import Selector
        doc = Selector(html)
        
        links = doc.css('a')
        print(f"  Total links: {len(links)}")
        
        # Find job links
        job_links = doc.css('a[href*="/du-an/"]')
        print(f"  Job links (/du-an/): {len(job_links)}")
        
        # Show first 5 job links
        if job_links:
            print("\n[3] Sample job links:")
            for i, link in enumerate(job_links[:5], 1):
                href = link.attrib.get('href', '')
                text = link.text.strip()[:50] if link.text else ''
                print(f"  {i}. {href}")
                if text:
                    print(f"     Text: {text}")
        
        return True
        
    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()
        return False


def test_blackhatworld():
    """Test BlackHatWorld với Scrapling Stealth."""
    print("\n" + "=" * 70)
    print("Testing BlackHatWorld with Scrapling Stealth")
    print("=" * 70)
    
    try:
        from scrapling.fetchers import StealthyFetcher
        
        print("\n[1] Fetching BlackHatWorld...")
        page = StealthyFetcher.fetch(
            'https://www.blackhatworld.com/seo/marketplace/',
            headless=True,
            solve_cloudflare=True,
            network_idle=True,
            timeout=45000,
        )
        
        html = str(page)
        print(f"[OK] Got {len(html)} characters")
        
        # Save HTML
        output_file = data_dir / "bhw_sample.html"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"[OK] Saved to {output_file}")
        
        # Analyze
        print("\n[2] Analyzing HTML structure...")
        from scrapling.parser import Selector
        doc = Selector(html)
        
        links = doc.css('a')
        print(f"  Total links: {len(links)}")
        
        thread_links = doc.css('a[href*="/threads/"]')
        print(f"  Thread links (/threads/): {len(thread_links)}")
        
        if thread_links:
            print("\n[3] Sample thread links:")
            for i, link in enumerate(thread_links[:5], 1):
                href = link.attrib.get('href', '')
                text = link.text.strip()[:50] if link.text else ''
                print(f"  {i}. {href}")
                if text:
                    print(f"     Text: {text}")
        
        return True
        
    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests."""
    print("\n" + "=" * 70)
    print("SCRAPLING STEALTH CRAWL TEST")
    print("=" * 70)
    
    results = {}
    
    # Test vLance
    results['vlance'] = test_vlance()
    
    # Test BlackHatWorld
    results['bhw'] = test_blackhatworld()
    
    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    
    for name, success in results.items():
        status = "OK" if success else "FAILED"
        print(f"  {name}: {status}")
    
    print("\n" + "=" * 70)
    print("NEXT STEPS:")
    print("1. Check HTML files in data/ directory")
    print("2. Update CSS selectors based on real DOM")
    print("3. Run full crawl with updated selectors")
    print("=" * 70)


if __name__ == "__main__":
    main()
