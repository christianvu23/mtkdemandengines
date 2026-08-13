#!/usr/bin/env python3
"""
AI Lead Classifier - Dùng LLM để phân loại jobs.
Phân loại: HOT_LEAD, WARM_LEAD, DISCUSSION, SPAM
"""

import json
import os
import sys
from pathlib import Path
from datetime import datetime

# API config
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
MODEL = "gpt-4o-mini"  # Rẻ và nhanh

# Classification prompt
CLASSIFY_PROMPT = """Bạn là chuyên gia phân loại job postings trong lĩnh vực marketing/branding.

Phân loại job posting này vào 1 trong 4 categories:

1. HOT_LEAD (điểm 90-100): Người đang TÌM NGƯỜI/AGENCY để thuê làm marketing
   - Ví dụ: "I am looking for marketing expert", "Need agency for branding", "Hiring freelancer"
   - Signal: "looking for", "need to hire", "seeking agency", "want to hire"

2. WARM_LEAD (điểm 70-89): Job posting rõ ràng, có thể apply
   - Ví dụ: "Email Marketing Expert needed", "SEO Specialist for project"
   - Signal: Job title + mô tả công việc cụ thể

3. DISCUSSION (điểm 20-40): Thảo luận, hỏi đáp, chia sẻ kinh nghiệm
   - Ví dụ: "How to do SEO?", "Best technique for marketing", "What do you think about..."
   - Signal: Câu hỏi, thảo luận, không có nhu cầu thuê

4. SPAM (điểm 0-19): Không liên quan, quảng cáo, spam
   - Ví dụ: "Buy followers cheap", "Free marketing tools", rules/welcome posts
   - Signal: Quảng cáo, rules, welcome, không phải job

Job Title: {title}
Description: {description}
Source: {source}

Trả về JSON format:
{{
  "category": "HOT_LEAD|WARM_LEAD|DISCUSSION|SPAM",
  "confidence": 0.0-1.0,
  "score": 0-100,
  "reason": "Giải thích ngắn gọn tại sao phân loại này"
}}

CHỈ trả về JSON, không thêm text khác."""


def classify_job(job: dict, api_key: str) -> dict:
    """Classify một job dùng OpenAI API."""
    
    if not api_key:
        # Fallback: rule-based classification
        return classify_rule_based(job)
    
    try:
        import httpx
        
        prompt = CLASSIFY_PROMPT.format(
            title=job.get('title', ''),
            description=job.get('description', '')[:500],
            source=job.get('source', 'unknown')
        )
        
        response = httpx.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": MODEL,
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.1,
                "max_tokens": 200,
            },
            timeout=30,
        )
        
        if response.status_code != 200:
            print(f"  [API Error] {response.status_code}: {response.text[:100]}")
            return classify_rule_based(job)
        
        result = response.json()
        content = result['choices'][0]['message']['content'].strip()
        
        # Parse JSON từ response
        # Remove markdown code blocks if present
        if content.startswith('```'):
            content = content.split('```')[1]
            if content.startswith('json'):
                content = content[4:]
            content = content.strip()
        
        classification = json.loads(content)
        
        return {
            'category': classification.get('category', 'DISCUSSION'),
            'confidence': classification.get('confidence', 0.5),
            'score': classification.get('score', 50),
            'reason': classification.get('reason', ''),
            'method': 'ai',
        }
        
    except Exception as e:
        print(f"  [Error] {e}")
        return classify_rule_based(job)


def classify_rule_based(job: dict) -> dict:
    """Fallback: Rule-based classification khi không có API."""
    
    title = job.get('title', '').lower()
    desc = job.get('description', '').lower()
    text = f"{title} {desc}"
    source = job.get('source', '')
    
    # SPAM signals (check first)
    spam_signals = [
        'welcome to', 'rules', 'new members start', 'updated marketplace',
        'thank you,', 'buy', 'free', 'cheap',
    ]
    
    if any(s in text for s in spam_signals):
        return {
            'category': 'SPAM',
            'confidence': 0.8,
            'score': 10,
            'reason': 'Contains spam/welcome/rules keywords',
            'method': 'rule',
        }
    
    # HOT_LEAD signals (strong hiring intent)
    # Must have clear hiring language, not just "need help/advice"
    hot_patterns = [
        r'\blooking for\b',
        r'\bi am looking for\b',
        r'\bwe are looking for\b',
        r'\bneed to hire\b',
        r'\bwant to hire\b',
        r'\bseeking (a |an )?(expert|specialist|freelancer|agency)\b',
        r'\bi need (a |an )?(expert|specialist|freelancer|agency|assistant|manager)\b',
        r'\bcần tìm\b',
        r'\btìm người\b',
        r'\bcần thuê\b',
        r'\bcần người\b',
    ]
    
    import re
    for pattern in hot_patterns:
        if re.search(pattern, text):
            # Verify it's not just asking for advice
            if 'advice' in text or 'tips' in text or 'how to' in text:
                break  # This is discussion, not hiring
            return {
                'category': 'HOT_LEAD',
                'confidence': 0.85,
                'score': 90,
                'reason': f'Matches pattern: {pattern}',
                'method': 'rule',
            }
    
    # WARM_LEAD signals (job postings)
    # PeoplePerHour/Freelancer.com titles are usually job postings
    warm_title_keywords = [
        'expert', 'specialist', 'consultant', 'manager', 'assistant',
        'freelancer', 'agency', 'part time', 'ongoing', 'contract',
    ]
    
    warm_desc_keywords = [
        'campaign', 'project', 'email marketing', 'seo', 'social media',
        'branding', 'marketing strategy', 'lead generation',
    ]
    
    # PeoplePerHour jobs are almost always job postings
    if source == 'peopleperhour':
        title_matches = [k for k in warm_title_keywords if k in title]
        if title_matches:
            return {
                'category': 'WARM_LEAD',
                'confidence': 0.8,
                'score': 80,
                'reason': f'Job posting from {source}: {", ".join(title_matches[:2])}',
                'method': 'rule',
            }
        # Even without keywords, PPH jobs are likely warm leads
        return {
            'category': 'WARM_LEAD',
            'confidence': 0.6,
            'score': 70,
            'reason': f'Job posting from {source}',
            'method': 'rule',
        }
    
    # WarriorForum: check for warm signals
    title_matches = [k for k in warm_title_keywords if k in title]
    desc_matches = [k for k in warm_desc_keywords if k in desc]
    
    if len(title_matches) >= 1 or len(desc_matches) >= 2:
        return {
            'category': 'WARM_LEAD',
            'confidence': 0.7,
            'score': 75,
            'reason': f'Warm signals: {", ".join((title_matches + desc_matches)[:3])}',
            'method': 'rule',
        }
    
    # Default: DISCUSSION
    return {
        'category': 'DISCUSSION',
        'confidence': 0.6,
        'score': 30,
        'reason': 'No strong signals detected',
        'method': 'rule',
    }


def classify_jobs(jobs_file: str, api_key: str = "", output_file: str = None):
    """Classify tất cả jobs từ file."""
    
    # Load jobs
    with open(jobs_file, 'r', encoding='utf-8') as f:
        jobs = json.load(f)
    
    print(f"Loaded {len(jobs)} jobs from {jobs_file}")
    print(f"Using: {'OpenAI API' if api_key else 'Rule-based fallback'}")
    print()
    
    # Classify each job
    classified = []
    for i, job in enumerate(jobs, 1):
        print(f"[{i}/{len(jobs)}] {job['title'][:50]}...")
        
        classification = classify_job(job, api_key)
        
        job_with_class = {
            **job,
            'category': classification['category'],
            'confidence': classification['confidence'],
            'score': classification['score'],
            'reason': classification['reason'],
            'method': classification['method'],
        }
        classified.append(job_with_class)
        
        print(f"  -> {classification['category']} (score: {classification['score']})")
    
    # Summary
    print("\n" + "=" * 70)
    print("CLASSIFICATION SUMMARY")
    print("=" * 70)
    
    from collections import Counter
    categories = Counter(j['category'] for j in classified)
    
    for cat in ['HOT_LEAD', 'WARM_LEAD', 'DISCUSSION', 'SPAM']:
        count = categories.get(cat, 0)
        pct = count / len(classified) * 100
        print(f"  {cat:15s}: {count:3d} ({pct:5.1f}%)")
    
    # Save results
    if not output_file:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_file = jobs_file.replace('.json', f'_classified_{timestamp}.json')
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(classified, f, indent=2, ensure_ascii=False)
    
    print(f"\n[OK] Saved to {output_file}")
    
    # Show HOT_LEADs
    hot_leads = [j for j in classified if j['category'] == 'HOT_LEAD']
    warm_leads = [j for j in classified if j['category'] == 'WARM_LEAD']
    
    if hot_leads:
        print(f"\n{'=' * 70}")
        print(f"HOT LEADS ({len(hot_leads)})")
        print("=" * 70)
        for lead in hot_leads:
            print(f"\n  Title: {lead['title'][:70]}")
            print(f"  Link: {lead['link'][:80]}")
            print(f"  Score: {lead['score']}, Reason: {lead['reason']}")
    
    if warm_leads:
        print(f"\n{'=' * 70}")
        print(f"WARM LEADS ({len(warm_leads)})")
        print("=" * 70)
        for lead in warm_leads[:10]:  # Show first 10
            print(f"\n  Title: {lead['title'][:70]}")
            print(f"  Link: {lead['link'][:80]}")
            print(f"  Score: {lead['score']}")
    
    return classified


def main():
    """Main function."""
    import argparse
    
    parser = argparse.ArgumentParser(description='AI Lead Classifier')
    parser.add_argument('jobs_file', help='Path to jobs JSON file')
    parser.add_argument('--output', '-o', help='Output file path')
    parser.add_argument('--api-key', help='OpenAI API key (or set OPENAI_API_KEY env)')
    
    args = parser.parse_args()
    
    if not Path(args.jobs_file).exists():
        print(f"[ERROR] File not found: {args.jobs_file}")
        sys.exit(1)
    
    # Get API key
    api_key = args.api_key or os.getenv('OPENAI_API_KEY', '')
    
    if not api_key:
        print("[WARN] No OpenAI API key found. Using rule-based fallback.")
        print("       Set OPENAI_API_KEY env or use --api-key for better results.")
        print()
    
    classify_jobs(args.jobs_file, api_key, args.output)


if __name__ == "__main__":
    main()
