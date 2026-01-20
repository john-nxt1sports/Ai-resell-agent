# Marketplace Automation System - Complete Guide

## 🎯 Overview

This system implements **professional-grade, Vendoo-style automated cross-listing** to multiple marketplaces including Poshmark, Mercari, eBay, and more. It uses browser automation with anti-detection measures to post listings automatically.

## 🏗️ Architecture

### Core Components

1. **Browser Automation Layer** (`lib/automation/browser-utils.ts`)
   - Playwright-based browser automation
   - Anti-detection measures (stealth mode, fingerprint randomization)
   - Human-like behavior simulation (typing, mouse movement, delays)
   - CAPTCHA detection

2. **Marketplace Bots** (`lib/automation/bots/`)
   - `poshmark.ts` - Poshmark automation
   - `mercari.ts` - Mercari automation
   - Extensible for more marketplaces

3. **Job Queue System** (`lib/automation/queue.ts`)
   - Bull queue with Redis backend
   - Automatic retries with exponential backoff
   - Progress tracking and monitoring
   - Job prioritization

4. **API Endpoints** (`app/api/automation/`)
   - `/queue-listing` - Queue listing for marketplace posting
   - `/job-status/[jobId]` - Check job status
   - `/credentials` - Manage marketplace credentials

5. **Database Schema**
   - `marketplace_credentials` - Encrypted user credentials
   - `listing_automation_results` - Track automation jobs
   - Marketplace-specific columns on `listings` table

## 🚀 Setup Instructions

### 1. Install Dependencies

Already installed:
```bash
npm install playwright playwright-extra puppeteer-extra-plugin-stealth bull ioredis bcryptjs nanoid
npx playwright install chromium
```

### 2. Setup Redis

**Option A: Local Redis (Development)**
```bash
# macOS
brew install redis
brew services start redis

# Or run manually
redis-server
```

**Option B: Cloud Redis (Production)**
Use Redis Cloud, Upstash, or Railway:
- Sign up for free tier
- Get connection URL
- Add to environment variables

### 3. Environment Variables

Add to `.env.local`:
```env
# Redis Connection
REDIS_URL=redis://127.0.0.1:6379

# Or for cloud Redis
# REDIS_URL=redis://username:password@host:port

# Optional: Proxy for IP rotation (recommended for production)
PROXY_SERVER=http://proxy-server:port
PROXY_USERNAME=username
PROXY_PASSWORD=password

# Optional: CAPTCHA solving service
CAPTCHA_API_KEY=your-2captcha-api-key
```

### 4. Run Database Migration

```bash
# Connect to your Supabase project
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres"

# Or use Supabase dashboard SQL editor
```

Run the migration file:
`supabase/migrations/004_marketplace_automation.sql`

### 5. Start the Worker Process

The queue processor needs to run as a separate process:

```bash
# Create a worker script
node scripts/automation-worker.js
```

Or use a process manager like PM2 for production:
```bash
npm install -g pm2
pm2 start scripts/automation-worker.js --name "listing-automation"
pm2 save
```

## 📖 How to Use

### For Users

1. **Connect Marketplace Accounts**
   - Go to Settings → Automated Marketplace Posting
   - Click "Connect" for each marketplace
   - Enter credentials (encrypted and stored securely)

2. **Create a Listing**
   - Go to "Create New Listing"
   - Upload images, add details
   - Select marketplaces to post to
   - Click "One Click Post with AI"
   - System automatically queues jobs for each marketplace

3. **Monitor Progress**
   - Dashboard shows posting status
   - Real-time updates on job progress
   - Links to live listings once posted

### For Developers

#### Queue a Listing Job

```typescript
import { queueListingJob } from "@/lib/automation/queue";

const job = await queueListingJob({
  listingId: "listing-uuid",
  userId: "user-uuid",
  marketplace: "poshmark",
  listing: {
    title: "Nike Air Jordan 1",
    description: "Great condition...",
    price: 150,
    category: "Shoes",
    condition: "like_new",
    brand: "Nike",
    size: "10",
    images: ["https://..."],
  },
  options: {
    retryOnFailure: true,
    maxRetries: 3,
  },
});

console.log(`Job queued: ${job.id}`);
```

#### Check Job Status

```typescript
import { getJobStatus } from "@/lib/automation/queue";

const status = await getJobStatus(jobId);
console.log(status);
// {
//   status: "completed",
//   progress: 100,
//   result: {
//     success: true,
//     marketplace: "poshmark",
//     url: "https://poshmark.com/listing/...",
//   }
// }
```

#### Add a New Marketplace Bot

```typescript
// lib/automation/bots/ebay.ts
import { MarketplaceBot } from "../types";

export class EbayBot implements MarketplaceBot {
  marketplace = "ebay" as const;
  
  async login(credentials) {
    // Implement eBay login
  }
  
  async createListing(data) {
    // Implement eBay listing creation
  }
  
  async verifySession() {
    // Check if still logged in
  }
  
  async close() {
    // Cleanup
  }
}
```

Then register in `queue.ts`:
```typescript
function createBot(marketplace: MarketplaceType) {
  switch (marketplace) {
    case "poshmark": return new PoshmarkBot();
    case "mercari": return new MercariBot();
    case "ebay": return new EbayBot(); // Add here
    default: return null;
  }
}
```

## 🛡️ Security & Anti-Detection

### Implemented Measures

1. **Browser Fingerprinting**
   - Realistic user agents
   - Random viewport sizes
   - Geolocation spoofing
   - Timezone emulation

2. **Human Behavior Simulation**
   - Random typing speeds
   - Natural mouse movements
   - Variable delays between actions
   - Smooth scrolling

3. **Session Management**
   - Cookie persistence
   - Session reuse to avoid repeated logins
   - Automatic session refresh

4. **Error Handling**
   - Automatic retries with backoff
   - CAPTCHA detection
   - Account lock detection
   - Rate limiting

### Best Practices

1. **Rate Limiting**
   ```typescript
   // Don't post too many listings at once
   // Add delays between marketplace postings
   await queueListingJob(data, {
     delay: 60000 * Math.random() * 5, // 0-5 minute delay
   });
   ```

2. **IP Rotation (Production)**
   Use residential proxies:
   ```typescript
   const browser = await createStealthBrowser({
     proxy: {
       server: process.env.PROXY_SERVER,
       username: process.env.PROXY_USERNAME,
       password: process.env.PROXY_PASSWORD,
     },
   });
   ```

3. **Account Safety**
   - Don't exceed marketplace posting limits
   - Spread posts throughout the day
   - Monitor failure rates
   - Implement cooldown periods

## 🔧 Configuration

### Queue Settings

Edit `lib/automation/queue.ts`:

```typescript
defaultJobOptions: {
  attempts: 3, // Number of retries
  backoff: {
    type: "exponential",
    delay: 5000, // Starting delay in ms
  },
  removeOnComplete: 100, // Keep last N completed jobs
  removeOnFail: 500, // Keep last N failed jobs
},
```

### Browser Settings

Edit bot files or `browser-utils.ts`:

```typescript
const browser = await chromium.launch({
  headless: true, // Set to false to see browser
  slowMo: 100, // Slow down by 100ms (for debugging)
});
```

## 📊 Monitoring & Debugging

### Queue Statistics

```typescript
import { getQueueStats } from "@/lib/automation/queue";

const stats = await getQueueStats();
// {
//   waiting: 5,
//   active: 2,
//   completed: 150,
//   failed: 3,
//   delayed: 10
// }
```

### View Job Details

```typescript
import { listingQueue } from "@/lib/automation/queue";

const job = await listingQueue.getJob(jobId);
console.log(job.data); // Job data
console.log(job.progress()); // Current progress
console.log(await job.getState()); // Current state
console.log(job.stacktrace); // Error stack if failed
```

### Bull Board (Optional)

Install Bull Board for web-based monitoring:

```bash
npm install @bull-board/express @bull-board/api
```

Setup dashboard:
```typescript
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';

const serverAdapter = new ExpressAdapter();
createBullBoard({
  queues: [new BullAdapter(listingQueue)],
  serverAdapter,
});

// Access at /admin/queues
```

## 🚨 Error Handling

### Common Errors

1. **LOGIN_FAILED**
   - Invalid credentials
   - Account locked
   - CAPTCHA required
   - **Solution**: User needs to update credentials or solve CAPTCHA manually

2. **CAPTCHA_DETECTED**
   - Bot detection triggered
   - **Solution**: Implement CAPTCHA solving service or mark for manual intervention

3. **RATE_LIMIT_EXCEEDED**
   - Too many posts in short time
   - **Solution**: Implement cooldown period, spread out jobs

4. **SESSION_EXPIRED**
   - Cookies expired
   - **Solution**: Automatic re-login on next attempt

### Handling Failed Jobs

Jobs automatically retry with exponential backoff. After max retries:

```typescript
listingQueue.on('failed', async (job, error) => {
  // Log to monitoring service
  console.error(`Job ${job.id} failed:`, error);
  
  // Notify user
  await sendNotification(job.data.userId, {
    type: 'listing_failed',
    marketplace: job.data.marketplace,
    error: error.message,
  });
  
  // If CAPTCHA, mark for manual posting
  if (error.code === 'CAPTCHA_DETECTED') {
    await markForManualPosting(job.data.listingId, job.data.marketplace);
  }
});
```

## 🎯 Production Checklist

- [ ] Redis server running and configured
- [ ] Database migrations applied
- [ ] Worker process running (PM2 or similar)
- [ ] Environment variables set
- [ ] Proxy configured (recommended)
- [ ] Error monitoring setup (Sentry, etc.)
- [ ] Rate limiting configured
- [ ] User notifications implemented
- [ ] Dashboard monitoring setup
- [ ] Backup strategy for failed jobs
- [ ] Load testing completed
- [ ] Security audit performed

## 🔐 Legal & Compliance

### Important Disclaimers

1. **Terms of Service**: Automated posting may violate marketplace ToS
2. **Use at Own Risk**: Account bans are possible
3. **Liability**: Users responsible for their marketplace accounts
4. **Recommendation**: Include clear disclaimers in your app

### Recommended User Agreement

```
By using automated posting:
- You understand this may violate marketplace terms of service
- You accept the risk of account suspension or termination
- You agree to use responsibly and within marketplace limits
- You acknowledge [Your Company] is not liable for account issues
```

## 📈 Scaling

### Horizontal Scaling

Run multiple worker processes:
```bash
pm2 start automation-worker.js -i 4  # 4 instances
```

### Performance Tuning

1. **Optimize Browser Instances**
   ```typescript
   // Reuse browser contexts when possible
   const browserPool = new BrowserPool(maxSize: 5);
   ```

2. **Parallel Processing**
   ```typescript
   // Process multiple marketplaces in parallel
   await Promise.all([
     postToPoshmark(),
     postToMercari(),
   ]);
   ```

3. **Caching**
   - Cache marketplace sessions
   - Cache category mappings
   - Cache image uploads

## 🆘 Support & Maintenance

### Regular Maintenance

1. **Update Browser**
   ```bash
   npx playwright install chromium
   ```

2. **Clean Old Jobs**
   ```typescript
   import { cleanOldJobs } from "@/lib/automation/queue";
   await cleanOldJobs(7 * 24 * 60 * 60 * 1000); // 7 days
   ```

3. **Monitor Failure Rates**
   - If failures spike, marketplaces may have changed UI
   - Update selectors in bot files

### Debugging Tips

1. **Run with Visible Browser**
   ```typescript
   const browser = await createStealthBrowser({ headless: false });
   ```

2. **Capture Screenshots**
   ```typescript
   await captureScreenshot(page, "step-name");
   ```

3. **Enable Verbose Logging**
   ```typescript
   process.env.DEBUG = "playwright:*";
   ```

## 🎉 Success!

Your Vendoo-style automation system is now ready to use! Users can:
- Connect marketplace accounts in Settings
- Create listings and auto-post to multiple platforms
- Track posting status in real-time
- Manage everything from one dashboard

For questions or issues, refer to the code comments or create an issue in your repository.
