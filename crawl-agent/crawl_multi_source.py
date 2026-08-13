#!/usr/bin/env python3
"""
Multi-source job crawler - Crawl từ nhiều job boards
"""

import json
import time
from datetime import datetime
from pathlib import Path
from curl_cffi import requests

# Data directory
DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)

# Job sources configuration
SOURCES = {
    "peopleperhour": {
        "name": "PeoplePerHour",
        "urls": [
            "https://www.peopleperhour.com/freelance-marketing-jobs",
            "https://www.peopleperhour.com/freelance-jobs/digital-marketing",
            "https://www.peopleperhour.com/freelance-jobs/social-media",
        ],
        "extractor": "extract_peopleperhour_jobs",
    },
    "freelancer": {
        "name": "Freelancer.com",
        "urls": [
            "https://www.freelancer.com/jobs/marketing/",
            "https://www.freelancer.com/jobs/digital-marketing/",
            "https://www.freelancer.com/jobs/social-media-marketing/",
        ],
        "extractor": "extract_freelancer_jobs",
    },
    "upwork": {
        "name": "Upwork",
        "urls": [
            "https://www.upwork.com/nx/find-work/best-matches",
        ],
        "extractor": "extract_upwork_jobs",
    },
    "guru": {
        "name": "Guru.com",
        "urls": [
            "https://www.guru.com/d/jobs/marketing/",
        ],
        "extractor": "extract_guru_jobs",
    },
}


def extract_peopleperhour_jobs(html, url):
    """Extract jobs từ PeoplePerHour."""
    from scrapling.parser import Selector
    
    doc = Selector(html)
    jobs = []
    
    # Tìm job links
    job_links = doc.css('a[href*="/freelance-jobs/"]')
    seen = set()
    
    for link in job_links:
        href = link.attrib.get('href', '')
        text = link.text.strip() if link.text else ''
        
        # Filter actual job links
        if '/freelance-jobs/' in href and href.count('/') > 4 and href not in seen:
            seen.add(href)
            
            if not href.startswith('http'):
                href = f"https://www.peopleperhour.com{href}"
            
            title = text if text else href.split('/')[-1].replace('-', ' ').title()
            
            jobs.append({
                'title': title[:150],
                'link': href,
                'description': '',
                'source': 'peopleperhour',
                'crawled_at': datetime.now().isoformat(),
            })
    
    return jobs


def extract_freelancer_jobs(html, url):
    """Extract jobs từ Freelancer.com."""
    from scrapling.parser import Selector
    
    doc = Selector(html)
    jobs = []
    
    # Tìm project links
    project_links = doc.css('a[href*="/projects/"]')
    seen = set()
    
    for link in project_links:
        href = link.attrib.get('href', '')
        text = link.text.strip() if link.text else ''
        
        # Bỏ qua "Bid now" links và các text ngắn
        if not text or text.lower() in ['bid now', 'view', 'apply']:
            continue
        
        # Filter actual project links
        if '/projects/' in href and href.count('/') >= 3 and href not in seen:
            seen.add(href)
            
            if not href.startswith('http'):
                href = f"https://www.freelancer.com{href}"
            
            jobs.append({
                'title': text[:150],
                'link': href,
                'description': '',
                'source': 'freelancer',
                'crawled_at': datetime.now().isoformat(),
            })
    
    return jobs


def extract_upwork_jobs(html, url):
    """Extract jobs từ Upwork."""
    from scrapling.parser import Selector
    
    doc = Selector(html)
    jobs = []
    
    # Upwork job cards
    job_cards = doc.css('[data-test="job-tile"], .job-tile, article[role="article"]')
    
    for card in job_cards:
        # Title
        title_el = card.css('h3 a, .job-title a, a[data-test="job-title"]')
        if not title_el:
            continue
            
        title = title_el[0].text.strip() if title_el[0].text else ''
        href = title_el[0].attrib.get('href', '')
        
        if not href.startswith('http'):
            href = f"https://www.upwork.com{href}"
        
        # Description
        desc_el = card.css('.job-description, .up-c-description, p')
        desc = desc_el[0].text.strip() if desc_el and desc_el[0].text else ''
        
        if title:
            jobs.append({
                'title': title[:150],
                'link': href,
                'description': desc[:500],
                'source': 'upwork',
                'crawled_at': datetime.now().isoformat(),
            })
    
    return jobs


def extract_guru_jobs(html, url):
    """Extract jobs từ Guru.com."""
    from scrapling.parser import Selector
    
    doc = Selector(html)
    jobs = []
    
    # Guru job listings
    job_items = doc.css('.job-item, .jobListing, [data-id]')
    
    for item in job_items:
        # Title
        title_el = item.css('h2 a, .job-title a, a.title')
        if not title_el:
            continue
            
        title = title_el[0].text.strip() if title_el[0].text else ''
        href = title_el[0].attrib.get('href', '')
        
        if not href.startswith('http'):
            href = f"https://www.guru.com{href}"
        
        # Description
        desc_el = item.css('.job-description, .description, p')
        desc = desc_el[0].text.strip() if desc_el and desc_el[0].text else ''
        
        if title:
            jobs.append({
                'title': title[:150],
                'link': href,
                'description': desc[:500],
                'source': 'guru',
                'crawled_at': datetime.now().isoformat(),
            })
    
    return jobs


def crawl_source(source_key, source_config):
    """Crawl một source."""
    print(f"\n{'='*60}")
    print(f"Crawling {source_config['name']}")
    print(f"{'='*60}")
    
    all_jobs = []
    
    for url in source_config['urls']:
        print(f"\nFetching: {url}")
        
        try:
            response = requests.get(
                url,
                impersonate="chrome",
                timeout=30,
                allow_redirects=True,
            )
            
            if response.status_code != 200:
                print(f"  [ERROR] Status {response.status_code}")
                continue
            
            print(f"  [OK] Got {len(response.text)} bytes")
            
            # Extract jobs
            extractor_name = source_config['extractor']
            extractor = globals()[extractor_name]
            jobs = extractor(response.text, url)
            
            print(f"  [OK] Extracted {len(jobs)} jobs")
            all_jobs.extend(jobs)
            
            # Delay between pages
            time.sleep(2)
            
        except Exception as e:
            print(f"  [ERROR] {e}")
    
    return all_jobs


def main():
    """Crawl tất cả sources."""
    print("\n" + "="*60)
    print("MULTI-SOURCE JOB CRAWLER")
    print("="*60)
    
    all_jobs = []
    
    for source_key, source_config in SOURCES.items():
        try:
            jobs = crawl_source(source_key, source_config)
            all_jobs.extend(jobs)
        except Exception as e:
            print(f"\n[ERROR] Failed to crawl {source_key}: {e}")
    
    # Save results
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = DATA_DIR / f"jobs_multi_{timestamp}.json"
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_jobs, f, indent=2, ensure_ascii=False)
    
    # Summary
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    print(f"Total jobs: {len(all_jobs)}")
    
    # Count by source
    from collections import Counter
    sources = Counter(job['source'] for job in all_jobs)
    for source, count in sources.items():
        print(f"  {source}: {count}")
    
    print(f"\n[OK] Saved to {output_file}")
    
    return all_jobs


if __name__ == "__main__":
    main()
