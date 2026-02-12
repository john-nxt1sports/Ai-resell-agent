#!/usr/bin/env python3
"""Check Redis queue status"""
from redis import Redis
import json

r = Redis.from_url('redis://localhost:6379', decode_responses=True)

# Check main queue
queue_len = r.llen('queue:listings')
print(f'Main Queue (queue:listings): {queue_len} jobs')

if queue_len > 0:
    items = r.lrange('queue:listings', 0, -1)
    for i, item in enumerate(items):
        data = json.loads(item)
        job_data = data.get('data', data)
        listing = job_data.get('listing', {})
        title = listing.get('title', 'N/A')
        mkts = job_data.get('marketplaces', [])
        print(f'  [{i}] Title: {title}')
        print(f'       Marketplaces: {mkts}')

# Check processing queue
processing_len = r.llen('queue:processing')
print(f'\nProcessing Queue (queue:processing): {processing_len} jobs')

if processing_len > 0:
    items = r.lrange('queue:processing', 0, -1)
    for i, item in enumerate(items):
        data = json.loads(item)
        job_data = data.get('data', data)
        listing = job_data.get('listing', {})
        title = listing.get('title', 'N/A')
        job_id = job_data.get('job_id', 'unknown')
        mkts = job_data.get('marketplaces', [])
        print(f'  [{i}] {job_id}: {title}')
        print(f'       Marketplaces: {mkts}')

# Show recent job statuses
print('\nRecent Job Statuses:')
keys = r.keys('job:*')
for key in sorted(keys)[-5:]:
    job = json.loads(r.get(key) or '{}')
    status = job.get('status', '?')
    print(f'  {key}: status={status}')
