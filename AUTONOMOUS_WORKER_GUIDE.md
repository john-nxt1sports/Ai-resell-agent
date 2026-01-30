# Autonomous Cross-Listing Worker - Implementation Guide (2026 Best Practices)

## Overview

This project implements a Vendoo-style hybrid architecture for autonomous cross-listing across multiple marketplaces. Users can close their browser while listings are posted automatically in the cloud.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  USER'S BROWSER (Extension)                                              │
│  - User logs into Poshmark, eBay, Mercari normally                      │
│  - Extension captures: cookies, localStorage, session tokens            │
│  - Syncs auth to backend → Cloud Browser Profile                        │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │ Session data synced
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  BACKEND (Next.js + Supabase)                                           │
│  - Receives and encrypts session data (AES-256-GCM)                     │
│  - Stores in PostgreSQL with RLS policies                               │
│  - Queues jobs to Redis for Python worker                               │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │ Job queued via Redis (Bull)
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PYTHON WORKER SERVICE (Cloud)                                          │
│  - Picks up job from Redis queue                                        │
│  - Loads user's encrypted sessions from database                        │
│  - Creates cloud browser with user's auth                               │
│  - browser-use Agent runs autonomously                                  │
│  - Posts to all platforms in parallel                                   │
│  - Sends webhook notification when done                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

## Implementation Status

### ✅ Phase 1: Session Capture & Sync (COMPLETE)

**Browser Extension:**
- ✅ `session-capture.js` - Captures cookies, localStorage, sessionStorage
- ✅ `background.js` - Integrated session sync logic
- ✅ `manifest.json` - Added cookies permission

**Backend APIs:**
- ✅ `/api/sessions/sync` - Receives encrypted sessions from extension
- ✅ `/api/sessions/validate` - Validates session status
- ✅ `/api/sessions/refresh` - Triggers session re-capture

**Security:**
- ✅ AES-256-GCM encryption for session data
- ✅ PBKDF2 key derivation
- ✅ Encrypted storage in PostgreSQL
- ✅ Row Level Security (RLS) policies

**Database:**
- ✅ `user_marketplace_sessions` table with indexes
- ✅ Automatic cleanup of expired sessions
- ✅ Browser profile ID tracking

### ✅ Phase 2: Python Worker Service (COMPLETE)

**Worker Structure:**
- ✅ `main.py` - Worker entry point with RQ integration
- ✅ `pyproject.toml` - Dependencies (browser-use, redis, supabase)
- ✅ Structured logging with structlog (JSON output)

**Orchestration:**
- ✅ `job_processor.py` - Coordinates multi-agent listing flow
- ✅ `state_manager.py` - Checkpoint-based recovery system
- ✅ Parallel marketplace posting

**Utilities:**
- ✅ `session_loader.py` - Loads sessions from Supabase
- ✅ `notifications.py` - Webhook notifications to Next.js
- ✅ `metrics.py` - Success rate tracking

**Agents (Placeholders):**
- ✅ `researcher.py` - Content optimization agent
- ✅ `poshmark_agent.py` - Poshmark listing agent
- ✅ `ebay_agent.py` - eBay listing agent
- ✅ `mercari_agent.py` - Mercari listing agent

### ✅ Phase 3: Job Queue & API Integration (COMPLETE)

**Queue System:**
- ✅ Bull + Redis integration (`listings-queue.ts`)
- ✅ Automatic retries with exponential backoff
- ✅ Job status tracking

**Backend APIs:**
- ✅ `/api/listings/post` - Queue job to Python worker
- ✅ `/api/jobs/webhook` - Receive completion from worker
- ✅ Session validation before queueing

**Features:**
- ✅ Job ID generation with nanoid
- ✅ Database tracking in `listing_automation_results`
- ✅ Missing session detection

### 🔄 Phase 4: browser-use Integration (PENDING)

**Tasks:**
- [ ] Install browser-use in Python worker
- [ ] Configure cloud browser connections
- [ ] Load user sessions into cloud browsers
- [ ] Implement full automation in platform agents:
  - [ ] Poshmark: Navigate form, upload images, submit
  - [ ] eBay: Handle multi-step listing process
  - [ ] Mercari: Simplified mobile-first flow
- [ ] Add AI vision for image analysis
- [ ] Integrate OpenRouter for content generation

### 🔄 Phase 5: State Management (COMPLETE FOR CHECKPOINTING)

**Completed:**
- ✅ Redis-based checkpointing
- ✅ Resume from any step
- ✅ Error state handling

**Pending:**
- [ ] Retry logic with backoff (partial - Bull handles retries)
- [ ] Advanced error recovery strategies

### 🔄 Phase 6: Real-Time Updates (PARTIAL)

**Completed:**
- ✅ Webhook notifications from worker

**Pending:**
- [ ] WebSocket server for real-time updates
- [ ] In-app notification UI
- [ ] Progress dashboard with live status
- [ ] Email notifications (optional)
- [ ] Push notifications (optional)

### 🔜 Phase 7: Inventory Orchestration (NOT STARTED)

**Planned:**
- [ ] Sale detection monitoring
- [ ] Cross-platform item matching
- [ ] Auto-delist on sale
- [ ] Price sync across platforms
- [ ] Inventory dashboard

## Environment Variables

### Next.js Backend

```env
# Session encryption (required)
SESSION_ENCRYPTION_KEY=<generate with: openssl rand -base64 32>

# Redis (required)
REDIS_URL=redis://localhost:6379
# Or Upstash: redis://:password@host:port

# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI (required)
OPENROUTER_API_KEY=your-openrouter-key
```

### Python Worker

```env
# Redis (required)
REDIS_URL=redis://localhost:6379

# Supabase (required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI (required)
OPENROUTER_API_KEY=your-openrouter-key

# Backend API (required)
NEXT_PUBLIC_API_URL=http://localhost:3000

# Optional
BROWSER_USE_API_KEY=your-browser-use-key
NOTIFICATIONS_WEBHOOK_ENABLED=true
```

## Deployment

### Next.js App (Vercel)

1. Deploy to Vercel as normal
2. Add environment variables in Vercel dashboard
3. Connect to Upstash Redis
4. Deploy!

### Python Worker (Railway or Render)

**Railway:**
```bash
cd services/listing-worker
railway init
railway add redis
railway up
```

**Render:**
1. Create Background Worker service
2. Add Redis instance
3. Set environment variables
4. Deploy from GitHub

## Testing Locally

### 1. Start Redis
```bash
docker run -d -p 6379:6379 redis
```

### 2. Start Next.js
```bash
npm run dev
```

### 3. Start Python Worker
```bash
cd services/listing-worker
pip install -e .
python main.py
```

### 4. Test Flow
1. Log into Poshmark/eBay/Mercari in browser with extension
2. Extension captures session automatically
3. Create listing in web app
4. Click "Post to All Platforms"
5. Job queues → Worker picks up → Posts in background
6. User can close browser - worker continues!

## Security Considerations

- ✅ AES-256-GCM encryption for session data
- ✅ PBKDF2 key derivation (100,000 iterations)
- ✅ Row Level Security (RLS) in database
- ✅ Service role key for worker (not exposed to client)
- ✅ Session expiration (7 days default)
- ✅ Automatic cleanup of expired sessions
- ⚠️ TODO: Rate limiting on APIs
- ⚠️ TODO: CSRF protection on webhook endpoint
- ⚠️ TODO: Webhook signature verification

## Monitoring & Observability

**Metrics Tracked:**
- Job success/failure rates
- Per-marketplace success rates
- Average processing time
- Error patterns

**Logging:**
- Structured JSON logs (structlog)
- All events logged with job_id, user_id, marketplace
- Error tracking with full stack traces

**Future:**
- Sentry integration for error tracking
- Datadog/NewRelic for APM
- Custom dashboard for admin metrics

## API Documentation

### POST /api/listings/post
Queue a listing job for autonomous posting.

**Request:**
```json
{
  "listingId": "uuid",
  "marketplaces": ["poshmark", "ebay", "mercari"]
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "job_abc123xyz",
  "message": "Listing job queued successfully",
  "marketplaces": ["poshmark", "ebay", "mercari"],
  "automationResults": [...]
}
```

### POST /api/sessions/sync
Sync marketplace session from extension.

**Request:**
```json
{
  "marketplace": "poshmark",
  "cookies": [...],
  "localStorage": {...},
  "sessionStorage": {...},
  "isLoggedIn": true,
  "timestamp": "2026-01-30T...",
  "userAgent": "Mozilla/5.0..."
}
```

**Response:**
```json
{
  "success": true,
  "marketplace": "poshmark",
  "browserProfileId": "bp_poshmark_xyz123",
  "message": "Session synced successfully"
}
```

### POST /api/jobs/webhook
Internal webhook from Python worker (not for direct client use).

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Make changes following 2026 best practices
4. Test thoroughly (unit tests + integration tests)
5. Commit with conventional commits (`feat: add amazing feature`)
6. Push to branch
7. Open Pull Request

## License

MIT License - see LICENSE file for details

## Support

- GitHub Issues: Report bugs and request features
- Email: support@listingsai.com
- Discord: Join our community (link in README)
