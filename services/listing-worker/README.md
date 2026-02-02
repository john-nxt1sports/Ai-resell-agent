# Listing Worker - Autonomous Cross-Listing Service

## Overview

This Python service processes listing jobs autonomously using browser-use for cloud browser automation. It enables users to close their browser while listings are posted to multiple marketplaces in the background.

## Architecture

```
User creates listing → Job queued in Redis → Worker picks up job →
Cloud browser with user's session → AI agents post to marketplaces →
Results saved → User notified
```

## Features

- **Autonomous Operation**: Runs 24/7 in the cloud
- **Browser-use Integration**: Cloud browsers with user sessions
- **Multi-Agent System**: Specialized agents for each marketplace
- **Checkpoint Recovery**: Resume from any point if worker crashes
- **Parallel Posting**: Post to multiple marketplaces simultaneously
- **Real-time Notifications**: Updates sent via webhooks

## Installation

### Prerequisites

- Python 3.11+
- Redis (for job queue)
- PostgreSQL (via Supabase)

### Setup

1. Install dependencies:
```bash
cd services/listing-worker
pip install -e .
```

2. Install Playwright browsers:
```bash
playwright install chromium
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your credentials
```

4. Run the worker:
```bash
python main.py
```

## Configuration

See `.env.example` for all configuration options.

Required variables:
- `REDIS_URL`: Redis connection URL
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key
- `OPENROUTER_API_KEY`: OpenRouter API key for AI

## Development

### Testing

```bash
pytest
```

### Code Quality

```bash
# Format code
black .

# Lint
ruff check .

# Type check
mypy .
```

## Deployment

### Railway

1. Create new project in Railway
2. Add Redis service
3. Set environment variables
4. Deploy from GitHub

### Render

1. Create new Background Worker
2. Add Redis instance
3. Configure environment
4. Deploy

## Architecture Details

### Job Processing Flow

1. **Job Received**: Worker picks up job from Redis queue
2. **Load Sessions**: Retrieve user's marketplace sessions from database
3. **Research**: Researcher agent analyzes and optimizes content
4. **Checkpoint**: Save state after research
5. **Post Listings**: Platform agents post to marketplaces in parallel
6. **Checkpoint**: Save state after each marketplace
7. **Complete**: Send webhook notification to backend

### Recovery System

If worker crashes:
1. Job state is saved in Redis checkpoint
2. On restart, worker loads checkpoint
3. Skips completed steps
4. Resumes from last checkpoint

### Agents

- **ResearcherAgent**: Content optimization
- **PoshmarkAgent**: Poshmark listing creation
- **EbayAgent**: eBay listing creation
- **MercariAgent**: Mercari listing creation

## Monitoring

Metrics tracked:
- Job success/failure rates
- Per-marketplace success rates
- Average processing time
- Error patterns

Access metrics via Redis:
```python
from utils.metrics import MetricsTracker
metrics = MetricsTracker(redis)
success_rate = await metrics.get_success_rate()
```

## License

MIT
