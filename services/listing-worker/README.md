# Listing Worker - Autonomous Cross-Listing Service

## Overview

This Python service processes listing jobs autonomously using browser-use for AI-powered browser automation. It supports **two modes**:

- **☁️ Cloud Mode** (Production): Uses captured sessions, runs in background
- **🖥️ Local Mode** (Testing): Connects to your Chrome via CDP

## Architecture

### Cloud Mode (Production/SaaS)

```
User creates listing → Browser extension captures sessions →
Job queued in Redis → Worker picks up job →
Cloud browser with injected session cookies →
AI agents post to marketplaces →
Results saved → User notified
```

### Local Mode (Testing/Personal)

```
User creates listing → Worker connects to user's Chrome via CDP →
AI agents post to marketplaces (using existing login) →
Results saved
```

## Features

- **Dual Mode**: Cloud (session capture) or Local (CDP connect)
- **Autonomous Operation**: Runs 24/7 in the cloud (cloud mode)
- **browser-use Integration**: AI-powered browser automation
- **Multi-Agent System**: Specialized agents for each marketplace
- **Checkpoint Recovery**: Resume from any point if worker crashes
- **Parallel Posting**: Post to multiple marketplaces simultaneously
- **Real-time Notifications**: Updates sent via webhooks

## Quick Start - Local Mode (Testing)

Perfect for testing on your own machine:

### 1. Start Chrome with Remote Debugging

```bash
# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

# Or use our helper script
./start_chrome_debug.sh
```

### 2. Log into Marketplaces

In the Chrome window that opened:

- Go to poshmark.com and log in
- Go to ebay.com and log in
- Go to mercari.com and log in

### 3. Test Connection

```bash
# Set your OpenRouter API key
export OPENROUTER_API_KEY=your-key

# Test connection (dry run)
python test_local_mode.py --marketplace poshmark --dry-run
```

### 4. Create a Test Listing

```bash
# Actually create a listing
python test_local_mode.py --marketplace poshmark
```

Watch your Chrome window - the AI will navigate and fill forms!

## Installation

### Prerequisites

- Python 3.11+
- Redis (for job queue) - cloud mode only
- PostgreSQL (via Supabase) - cloud mode only
- Chrome browser - local mode only

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
# Cloud mode (production)
BROWSER_MODE=cloud python main.py

# Local mode (testing)
BROWSER_MODE=local python main.py
```

## Configuration

See `.env.example` for all configuration options.

### Cloud Mode Variables

- `REDIS_URL`: Redis connection URL
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key
- `OPENROUTER_API_KEY`: OpenRouter API key for AI
- `BROWSER_USE_API_KEY`: Browser-use cloud API key
- `SESSION_ENCRYPTION_KEY`: Key to decrypt captured sessions

### Local Mode Variables

- `OPENROUTER_API_KEY`: OpenRouter API key for AI
- `BROWSER_MODE=local`: Enable local mode
- `CHROME_CDP_URL`: Chrome DevTools URL (default: http://localhost:9222)

## Development

### Testing

```bash
# Run tests
pytest

# Test local mode
python test_local_mode.py --marketplace poshmark --dry-run
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

### Railway (Cloud Mode)

1. Create new project in Railway
2. Add Redis service
3. Set environment variables
4. Deploy from GitHub

### Render (Cloud Mode)

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
