#!/usr/bin/env python3
"""
Submit leads về Workers API.
"""

import json
import sys
from pathlib import Path

# Workers API endpoint
WORKERS_URL = "https://mtkdemandengines.christianvu23.workers.dev"


def submit_leads(leads_file, token):
    """Submit leads từ file JSON về Workers API."""
    
    # Load leads
    with open(leads_file, 'r', encoding='utf-8') as f:
        leads = json.load(f)
    
    if not leads:
        print("[WARN] No leads to submit")
        return
    
    # Filter only HOT_LEAD and WARM_LEAD if classification exists
    if 'category' in leads[0]:
        hot_warm = [l for l in leads if l.get('category') in ['HOT_LEAD', 'WARM_LEAD']]
        print(f"Found {len(hot_warm)} HOT/WARM leads (out of {len(leads)} total)")
        leads = hot_warm
    
    if not leads:
        print("[WARN] No HOT_LEAD or WARM_LEAD to submit")
        return
    
    print(f"Submitting {len(leads)} leads to Workers API...")
    print(f"URL: {WORKERS_URL}/api/crawl/submit")
    
    try:
        import httpx
        
        # Format leads cho Workers API
        payload = {
            "leads": [
                {
                    "source": lead.get('source', 'crawl'),
                    "url": lead.get('link', ''),
                    "noiDung": f"{lead.get('title', '')}\n\n{lead.get('description', '')}".strip(),
                    "tieuDe": lead.get('title', ''),
                    "postedAt": lead.get('crawled_at'),
                }
                for lead in leads
            ]
        }
        
        response = httpx.post(
            f"{WORKERS_URL}/api/crawl/submit",
            json=payload,
            headers={
                "X-Demand-Token": token,
                "Content-Type": "application/json",
            },
            timeout=30,
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"\n[OK] Submitted successfully!")
            print(f"  Accepted: {result.get('accepted', 0)}")
            print(f"  Rejected: {result.get('rejected', 0)}")
            print(f"  Run label: {result.get('run_label', 'N/A')}")
            
            if result.get('preview'):
                print(f"\n[Preview] First 3 leads:")
                for lead in result['preview'][:3]:
                    print(f"  - {lead.get('tieu_de', 'N/A')[:50]}")
                    print(f"    Score: {lead.get('diem', 'N/A')}, Tier: {lead.get('hang', 'N/A')}")
        else:
            print(f"\n[ERROR] Status {response.status_code}")
            print(f"Response: {response.text[:200]}")
    
    except Exception as e:
        print(f"\n[ERROR] {e}")


def main():
    """Main function."""
    if len(sys.argv) < 2:
        print("Usage: python submit_leads.py <leads_file.json> [token]")
        print("\nExample:")
        print("  python submit_leads.py data/leads_20260813_153809.json YOUR_TOKEN")
        sys.exit(1)
    
    leads_file = sys.argv[1]
    token = sys.argv[2] if len(sys.argv) > 2 else input("Enter DEMAND_TOKEN: ")
    
    if not Path(leads_file).exists():
        print(f"[ERROR] File not found: {leads_file}")
        sys.exit(1)
    
    submit_leads(leads_file, token)


if __name__ == "__main__":
    main()
