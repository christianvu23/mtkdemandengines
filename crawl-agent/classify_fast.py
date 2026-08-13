#!/usr/bin/env python3
"""
Fast Lead Classifier - Batch processing + disable reasoning
Phân loại jobs nhanh hơn 10-20x so với classify từng job.

Hardening (2026-08):
- Match kết quả LLM theo marker JOB-xx duy nhất, validate 1:1; lệch → rule-based CẢ batch.
- Bỏ confidence 0.8 hardcode — derive từ score.
- Inject feedback từ quyết định duyệt lead của người (data/feedback.json).
"""

import json
import os
import sys
import time
from pathlib import Path
from datetime import datetime

# API config
ALIBABA_API_KEY = os.getenv("ALIBABA_API_KEY", "")
ALIBABA_ENDPOINT = "https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions"
ALIBABA_MODEL = "qwen3.8-max"

# Batch size mặc định (override qua --batch-size)
DEFAULT_BATCH_SIZE = 10

BATCH_CLASSIFY_PROMPT = """You are a job classification expert for marketing/branding services.

Classify each job posting into one of these categories:
- HOT_LEAD (score 90-100): Someone actively looking to hire a person/agency for marketing work
- WARM_LEAD (score 70-89): Clear job posting that can be applied to
- DISCUSSION (score 20-40): Discussion, Q&A, experience sharing (not hiring)
- SPAM (score 0-19): Irrelevant, ads, rules, welcome posts

Jobs to classify:
{jobs_text}
{preference}
Respond with ONLY a JSON array (no markdown, no explanation). Each item MUST echo
back the exact marker of the job it classifies:
[
  {{"job": "JOB-0", "category": "HOT_LEAD", "score": 90, "reason": "brief reason"}},
  {{"job": "JOB-1", "category": "WARM_LEAD", "score": 75, "reason": "brief reason"}},
  ...
]"""


def _llm_confidence(score: int) -> float:
    """Confidence trung thực: derive từ score, không hardcode.
    Score càng cực đoan (rất cao/rất thấp) càng dễ tin; giữa khoảng thì kém chắc chắn hơn."""
    distance_from_mid = abs(score - 50) / 50.0  # 0..1
    return round(0.5 + 0.45 * distance_from_mid, 2)


def classify_batch(jobs: list, api_key: str, batch_start: int = 0,
                   preference: str = "") -> list:
    """Classify a batch of jobs in one API call.

    An toàn: nếu LLM trả về thiếu/thừa/lệch marker thì fallback rule-based
    CHO CẢ BATCH — không trộn lẫn kết quả lệch dòng với kết quả đúng.
    """

    if not api_key:
        return [classify_rule_based(job) for job in jobs]

    # Build jobs text với marker duy nhất cho từng job
    jobs_text = ""
    for i, job in enumerate(jobs):
        marker = f"JOB-{batch_start + i}"
        jobs_text += f"\n[{marker}] Title: {job.get('title', '')}"
        desc = job.get('description', '')[:200]
        if desc:
            jobs_text += f"\n    Description: {desc}"
        jobs_text += f"\n    Source: {job.get('source', 'unknown')}"

    preference_block = f"\n{preference}\n" if preference else ""
    prompt = BATCH_CLASSIFY_PROMPT.format(jobs_text=jobs_text, preference=preference_block)
    
    try:
        import httpx
        
        response = httpx.post(
            ALIBABA_ENDPOINT,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": ALIBABA_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 1000,
                "temperature": 0.1,
                "chat_template_kwargs": {"enable_thinking": False}  # Disable reasoning for speed
            },
            timeout=60,
        )
        
        if response.status_code != 200:
            print(f"  [API Error] {response.status_code}")
            return [classify_rule_based(job) for job in jobs]
        
        result = response.json()
        content = result['choices'][0]['message']['content'].strip()

        # Parse JSON array
        # Remove markdown code blocks if present
        if content.startswith('```'):
            content = content.split('```')[1]
            if content.startswith('json'):
                content = content[4:]
            content = content.strip()

        classifications = json.loads(content)

        # Validate 1:1 theo marker — KHÔNG match theo thứ tự hay index mù
        expected_markers = {f"JOB-{batch_start + i}" for i in range(len(jobs))}
        by_marker = {}
        for cls in classifications:
            marker = cls.get('job') or (f"JOB-{cls['id']}" if isinstance(cls.get('id'), int) else None)
            if marker in expected_markers and marker not in by_marker:
                by_marker[marker] = cls

        if set(by_marker.keys()) != expected_markers:
            missing = sorted(expected_markers - set(by_marker.keys()))
            print(f"  [WARN] LLM trả thiếu/lệch marker {missing} — fallback rule-based cả batch")
            return [classify_rule_based(job) for job in jobs]

        results = []
        for i in range(len(jobs)):
            cls = by_marker[f"JOB-{batch_start + i}"]
            score = max(0, min(100, int(cls.get('score', 50))))
            results.append({
                'category': cls.get('category', 'DISCUSSION'),
                'confidence': _llm_confidence(score),
                'score': score,
                'reason': cls.get('reason', ''),
                'method': 'alibaba_batch',
            })

        return results

    except Exception as e:
        print(f"  [Error] {e}")
        return [classify_rule_based(job) for job in jobs]


def classify_rule_based(job: dict) -> dict:
    """Fallback: Rule-based classification."""
    import re
    
    title = job.get('title', '').lower()
    desc = job.get('description', '').lower()
    text = f"{title} {desc}"
    source = job.get('source', '')
    
    # SPAM signals
    spam_signals = ['welcome to', 'rules', 'new members start', 'updated marketplace', 'thank you,']
    if any(s in text for s in spam_signals):
        return {'category': 'SPAM', 'confidence': 0.8, 'score': 10, 'reason': 'Spam/welcome/rules', 'method': 'rule'}
    
    # HOT_LEAD signals
    hot_patterns = [r'\blooking for\b', r'\bi am looking for\b', r'\bneed to hire\b', r'\bwant to hire\b']
    for pattern in hot_patterns:
        if re.search(pattern, text):
            if 'advice' not in text and 'tips' not in text:
                return {'category': 'HOT_LEAD', 'confidence': 0.85, 'score': 90, 'reason': f'Pattern: {pattern}', 'method': 'rule'}
    
    # WARM_LEAD for PeoplePerHour
    if source == 'peopleperhour':
        return {'category': 'WARM_LEAD', 'confidence': 0.7, 'score': 75, 'reason': 'Job posting', 'method': 'rule'}
    
    # DISCUSSION default
    return {'category': 'DISCUSSION', 'confidence': 0.6, 'score': 30, 'reason': 'No strong signals', 'method': 'rule'}


def classify_jobs_fast(jobs_file: str, api_key: str = "", output_file: str = None,
                        batch_size: int = DEFAULT_BATCH_SIZE, preference: str = ""):
    """Classify all jobs using batch processing."""

    # Load jobs
    with open(jobs_file, 'r', encoding='utf-8') as f:
        jobs = json.load(f)

    print(f"Loaded {len(jobs)} jobs from {jobs_file}")
    print(f"Using: {'Alibaba API (batch)' if api_key else 'Rule-based fallback'}")
    print(f"Batch size: {batch_size}")
    if preference:
        print(f"Feedback: đã inject preference từ {preference.count(chr(10))} dòng lịch sử duyệt")
    print()

    # Classify in batches
    all_results = []
    start_time = time.time()

    for i in range(0, len(jobs), batch_size):
        batch = jobs[i:i + batch_size]
        batch_num = i // batch_size + 1
        total_batches = (len(jobs) + batch_size - 1) // batch_size

        print(f"[Batch {batch_num}/{total_batches}] Classifying {len(batch)} jobs...")

        classifications = classify_batch(batch, api_key, batch_start=i, preference=preference)

        for job, cls in zip(batch, classifications):
            all_results.append({
                **job,
                'category': cls['category'],
                'confidence': cls['confidence'],
                'score': cls['score'],
                'reason': cls['reason'],
                'method': cls['method'],
            })

    elapsed = time.time() - start_time
    if all_results:
        print(f"\n[OK] Classified {len(all_results)} jobs in {elapsed:.1f}s")
        print(f"     Average: {elapsed/len(all_results):.2f}s per job")
    
    # Summary
    from collections import Counter
    categories = Counter(j['category'] for j in all_results)
    
    print(f"\n{'=' * 60}")
    print("CLASSIFICATION SUMMARY")
    print(f"{'=' * 60}")
    
    for cat in ['HOT_LEAD', 'WARM_LEAD', 'DISCUSSION', 'SPAM']:
        count = categories.get(cat, 0)
        pct = count / len(all_results) * 100
        print(f"  {cat:15s}: {count:3d} ({pct:5.1f}%)")
    
    # Save results
    if not output_file:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_file = jobs_file.replace('.json', f'_fast_{timestamp}.json')
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False)
    
    print(f"\n[OK] Saved to {output_file}")
    
    # Show leads
    hot_leads = [j for j in all_results if j['category'] == 'HOT_LEAD']
    warm_leads = [j for j in all_results if j['category'] == 'WARM_LEAD']
    
    if hot_leads:
        print(f"\n{'=' * 60}")
        print(f"HOT LEADS ({len(hot_leads)})")
        print(f"{'=' * 60}")
        for lead in hot_leads[:5]:
            print(f"\n  Title: {lead.get('title', '')[:70]}")
            print(f"  Link: {lead.get('link', '')[:80]}")
            print(f"  Score: {lead['score']}")
    
    if warm_leads:
        print(f"\n{'=' * 60}")
        print(f"WARM LEADS ({len(warm_leads)})")
        print(f"{'=' * 60}")
        for lead in warm_leads[:5]:
            print(f"\n  Title: {lead['title'][:70]}")
            print(f"  Score: {lead['score']}")
    
    return all_results


def main():
    """Main function."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Fast Lead Classifier (Batch Processing)')
    parser.add_argument('jobs_file', help='Path to jobs JSON file')
    parser.add_argument('--output', '-o', help='Output file path')
    parser.add_argument('--api-key', help='Alibaba API key')
    parser.add_argument('--batch-size', type=int, default=DEFAULT_BATCH_SIZE, help='Jobs per batch (default: 10)')
    parser.add_argument('--no-feedback', action='store_true',
                        help='Không inject lịch sử duyệt lead vào prompt')

    args = parser.parse_args()

    if not Path(args.jobs_file).exists():
        print(f"[ERROR] File not found: {args.jobs_file}")
        sys.exit(1)

    # Get API key
    api_key = args.api_key or os.getenv('ALIBABA_API_KEY', '')

    if not api_key:
        print("[WARN] No API key. Using rule-based fallback.")
        print("       Set ALIBABA_API_KEY or use --api-key for AI classification.")
        print()

    # Feedback loop: học từ quyết định duyệt lead của người (nếu có)
    preference = ""
    if not args.no_feedback:
        try:
            from utils.feedback import load_feedback, build_preference_prompt
            preference = build_preference_prompt(load_feedback())
        except ImportError:
            pass  # chạy ngoài thư mục crawl-agent — bỏ qua feedback

    classify_jobs_fast(args.jobs_file, api_key, args.output,
                       batch_size=args.batch_size, preference=preference)


if __name__ == "__main__":
    main()
