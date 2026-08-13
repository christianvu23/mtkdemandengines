#!/usr/bin/env python3
"""
Test với curl_cffi trực tiếp để xem response thật.
"""

import sys
from pathlib import Path

# Create data directory
data_dir = Path(__file__).parent / "data"
data_dir.mkdir(exist_ok=True)


def test_curl_cffi(url, name):
    """Test URL với curl_cffi trực tiếp."""
    print("=" * 70)
    print(f"Testing {name}")
    print(f"URL: {url}")
    print("=" * 70)
    
    try:
        from curl_cffi import requests
        
        print("\n[1] Fetching with curl_cffi...")
        response = requests.get(
            url,
            impersonate="chrome",
            timeout=30,
            allow_redirects=True,
        )
        
        print(f"  Status: {response.status_code}")
        print(f"  Content length: {len(response.text)}")
        print(f"  Final URL: {response.url}")
        
        if response.status_code == 200 and len(response.text) > 1000:
            print("\n[OK] Got real content!")
            
            # Save to file
            safe_name = name.replace(" ", "_").replace(".", "_").lower()
            output_file = data_dir / f"{safe_name}_curl.html"
            with open(output_file, "w", encoding="utf-8") as f:
                f.write(response.text)
            print(f"  Saved to {output_file}")
            
            # Quick analysis
            from scrapling.parser import Selector
            doc = Selector(response.text)
            links = doc.css('a')
            print(f"  Total links: {len(links)}")
            
            # Show title
            title = doc.css('title')
            if title and title[0].text:
                print(f"  Title: {title[0].text.strip()[:80]}")
            
            # Show first 5 links
            print("\n[2] Sample links:")
            count = 0
            for link in links[:50]:
                href = link.attrib.get('href', '')
                text = link.text.strip() if link.text else ''
                if text and len(text) > 10:
                    print(f"  - {text[:60]}")
                    print(f"    {href[:80]}")
                    count += 1
                    if count >= 5:
                        break
            
            return True
        else:
            print("\n[WARN] No real content")
            print(f"  Response preview: {response.text[:200]}")
            return False
        
    except Exception as e:
        print(f"\n[ERROR] {e}")
        return False


def main():
    """Run all tests."""
    print("\n" + "=" * 70)
    print("CURL_CFFI DIRECT TEST")
    print("=" * 70)
    
    # Sites to test
    sites = [
        ("https://www.warriorforum.com/main-internet-marketing-discussion-forum/", "WarriorForum"),
        ("https://www.peopleperhour.com/freelance-marketing-jobs", "PeoplePerHour"),
        ("https://www.freelancer.com/jobs/marketing/", "Freelancer.com"),
    ]
    
    results = {}
    
    for url, name in sites:
        results[name] = test_curl_cffi(url, name)
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
    if success_count > 0:
        print("SUCCESS! Check HTML files in data/ directory")
        print("Next: Update CSS selectors based on real DOM")
    else:
        print("ALL FAILED - sites are blocking or need JS rendering")
        print("Try Camoufox for anti-detect browsing")
    print("=" * 70)


if __name__ == "__main__":
    main()
