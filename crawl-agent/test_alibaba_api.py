#!/usr/bin/env python3
"""
Test Alibaba Cloud API với token plan.
"""

import json
import os
from pathlib import Path

# Load config
config_file = Path.home() / ".bailian" / "config.json"
if not config_file.exists():
    config_file = Path("C:/Users/ADMIN/.bailian/config.json")

with open(config_file, 'r') as f:
    config = json.load(f)

api_key = config['token-plan']['api_key']
base_url = config['token-plan']['base_url']
model = config['token-plan']['default_text_model']

print(f"API Key: {api_key[:20]}...")
print(f"Base URL: {base_url}")
print(f"Model: {model}")
print()

# Test API
try:
    import httpx
    
    print("Testing API...")
    response = httpx.post(
        f"{base_url}/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
            "messages": [{"role": "user", "content": "Hello, test API"}],
            "max_tokens": 50,
        },
        timeout=30,
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:500]}")
    
    if response.status_code == 200:
        result = response.json()
        print("\n[OK] API works!")
        print(f"Content: {result['choices'][0]['message']['content']}")
    else:
        print(f"\n[ERROR] API failed: {response.status_code}")
        
except Exception as e:
    print(f"\n[ERROR] {e}")
    import traceback
    traceback.print_exc()
