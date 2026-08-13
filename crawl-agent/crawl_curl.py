#!/usr/bin/env python3
"""
Crawler dùng curl_cffi để bypass anti-bot.
Extract job listings từ WarriorForum, PeoplePerHour, Freelancer.com.
"""

import json
import sys
from pathlib import Path
from datetime import datetime

# Create data directory
data_dir = Path(__file__).parent / "data"
data_dir.mkdir(exist_ok=True)


def extract_warriorforum_jobs(html):
    """Extract thread/job listings từ WarriorForum HTML."""
    from scrapling.parser import Selector
    
    doc = Selector(html)
    jobs = []
    
    # WarriorForum uses ArticleSnapshot structure
    articles = doc.css('.ArticleSnapshot')
    
    for article in articles:
        # Extract title and link from ArticleSnapshot-title
        title_el = article.css('.ArticleSnapshot-title a')
        if not title_el:
            continue
            
        title = title_el[0].text.strip() if title_el[0].text else ''
        link = title_el[0].attrib.get('href', '') if title_el else ''
        
        # Extract description from blurb
        desc_el = article.css('.ArticleSnapshot-blurb')
        desc = desc_el[0].text.strip() if desc_el and desc_el[0].text else ''
        
        if title and link:
            # Clean up URL (remove tracking params)
            link = link.split('?')[0]
            
            jobs.append({
                'title': title,
                'link': link,
                'description': desc[:500],
                'source': 'warriorforum',
                'crawled_at': datetime.now().isoformat(),
            })
    
    return jobs


def extract_peopleperhour_jobs(html):
    """Extract job listings từ PeoplePerHour HTML."""
    from scrapling.parser import Selector
    
    doc = Selector(html)
    jobs = []
    
    # Find job links
    job_links = doc.css('a[href*="/freelance-jobs/"]')
    
    seen_links = set()
    for link_el in job_links:
        href = link_el.attrib.get('href', '')
        text = link_el.text.strip() if link_el.text else ''
        
        # Filter actual job links (not category links)
        if '/freelance-jobs/' in href and href.count('/') > 4 and href not in seen_links:
            seen_links.add(href)
            
            if not href.startswith('http'):
                href = f"https://www.peopleperhour.com{href}"
            
            # Extract job title from URL or text
            title = text if text else href.split('/')[-1].replace('-', ' ').title()
            
            jobs.append({
                'title': title[:100],
                'link': href,
                'description': '',
                'source': 'peopleperhour',
                'crawled_at': datetime.now().isoformat(),
            })
    
    return jobs


def extract_freelancer_jobs(html):
    """Extract job listings từ Freelancer.com HTML."""
    from scrapling.parser import Selector
    
    doc = Selector(html)
    jobs = []
    
    # Find project links
    project_links = doc.css('a[href*="/projects/"]')
    
    seen_links = set()
    for link_el in project_links:
        href = link_el.attrib.get('href', '')
        text = link_el.text.strip() if link_el.text else ''
        
        # Filter actual project links (not category links)
        if '/projects/' in href and href.count('/') > 3 and href not in seen_links:
            seen_links.add(href)
            
            if not href.startswith('http'):
                href = f"https://www.freelancer.com{href}"
            
            # Extract job title from URL or text
            title = text if text else href.split('/')[-1].replace('-', ' ').title()
            
            jobs.append({
                'title': title[:100],
                'link': href,
                'description': '',
                'source': 'freelancer_com',
                'crawled_at': datetime.now().isoformat(),
            })
    
    return jobs


def crawl_site(url, name, extractor):
    """Crawl một site và extract jobs."""
    print("=" * 70)
    print(f"Crawling {name}")
    print(f"URL: {url}")
    print("=" * 70)
    
    try:
        from curl_cffi import requests
        
        print("\n[1] Fetching...")
        response = requests.get(
            url,
            impersonate="chrome",
            timeout=30,
            allow_redirects=True,
        )
        
        if response.status_code != 200:
            print(f"[ERROR] Status {response.status_code}")
            return []
        
        print(f"[OK] Got {len(response.text)} characters")
        
        print("\n[2] Extracting jobs...")
        jobs = extractor(response.text)
        print(f"[OK] Found {len(jobs)} jobs")
        
        return jobs
        
    except Exception as e:
        print(f"\n[ERROR] {e}")
        return []


def filter_lead_signals(jobs):
    """Filter jobs có signal là lead (tuyển dụng, cần người)."""
    LEAD_SIGNALS = [
        # Vietnamese
        'cần tìm', 'cần thuê', 'tìm người', 'tìm agency', 'tìm freelancer',
        'cần người', 'tìm đội', 'cần đội', 'cần chạy ads', 'thuê ngoài',
        'cần thiết kế', 'cần làm marketing', 'cần quay',
        # English
        'looking for', 'need help', 'hiring', 'looking to hire',
        'need marketing', 'looking for agency', 'need someone',
        'required', 'seeking', 'want to hire',
    ]
    
    leads = []
    for job in jobs:
        text = f"{job['title']} {job['description']}".lower()
        if any(signal in text for signal in LEAD_SIGNALS):
            leads.append(job)
    
    return leads


def main():
    """Crawl tất cả sites và save results."""
    print("\n" + "=" * 70)
    print("CURL_CFFI CRAWLER")
    print("=" * 70)
    
    # Sites to crawl
    sites = [
        {
            'url': 'https://www.warriorforum.com/main-internet-marketing-discussion-forum/',
            'name': 'WarriorForum',
            'extractor': extract_warriorforum_jobs,
        },
        {
            'url': 'https://www.peopleperhour.com/freelance-marketing-jobs',
            'name': 'PeoplePerHour',
            'extractor': extract_peopleperhour_jobs,
        },
        {
            'url': 'https://www.freelancer.com/jobs/marketing/',
            'name': 'Freelancer.com',
            'extractor': extract_freelancer_jobs,
        },
    ]
    
    all_jobs = []
    
    for site in sites:
        jobs = crawl_site(site['url'], site['name'], site['extractor'])
        all_jobs.extend(jobs)
        print()
    
    # Save raw jobs
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    jobs_file = data_dir / f"jobs_{timestamp}.json"
    with open(jobs_file, 'w', encoding='utf-8') as f:
        json.dump(all_jobs, f, indent=2, ensure_ascii=False)
    print(f"\n[OK] Saved {len(all_jobs)} jobs to {jobs_file}")
    
    # Auto-classify if classify_leads is available
    try:
        from classify_leads import classify_jobs
        import os
        
        api_key = os.getenv('OPENAI_API_KEY', '')
        print(f"\n{'=' * 70}")
        print("AUTO-CLASSIFYING LEADS")
        print("=" * 70)
        
        classified = classify_jobs(
            str(jobs_file),
            api_key=api_key,
            output_file=str(data_dir / f"leads_{timestamp}.json")
        )
        
        # Summary
        hot_leads = [j for j in classified if j['category'] == 'HOT_LEAD']
        warm_leads = [j for j in classified if j['category'] == 'WARM_LEAD']
        
        print(f"\n{'=' * 70}")
        print("FINAL SUMMARY")
        print("=" * 70)
        print(f"  Total jobs: {len(all_jobs)}")
        print(f"  HOT_LEAD: {len(hot_leads)} ({len(hot_leads)/len(all_jobs)*100:.1f}%)")
        print(f"  WARM_LEAD: {len(warm_leads)} ({len(warm_leads)/len(all_jobs)*100:.1f}%)")
        print(f"  Total leads: {len(hot_leads) + len(warm_leads)} ({(len(hot_leads) + len(warm_leads))/len(all_jobs)*100:.1f}%)")
        
    except ImportError:
        print("\n[WARN] classify_leads not found, skipping classification")
        # Fallback: filter with old method
        leads = filter_lead_signals(all_jobs)
        leads_file = data_dir / f"leads_{timestamp}.json"
        with open(leads_file, 'w', encoding='utf-8') as f:
            json.dump(leads, f, indent=2, ensure_ascii=False)
        print(f"[OK] Saved {len(leads)} leads to {leads_file}")
    
    print("\n" + "=" * 70)
    print("NEXT STEPS:")
    print("1. Review leads in data/ directory")
    print("2. Submit leads to Workers API: python submit_leads.py data/leads_*.json YOUR_TOKEN")
    print("3. Setup OpenAI API for better classification: export OPENAI_API_KEY=your_key")
    print("=" * 70)


if __name__ == "__main__":
    main()
