# 🧪 Testing Guide - Get Your Automation Working

Follow these steps in order to test the marketplace automation system.

---

## Step 1: Run Database Migration ⚡ (REQUIRED)

You need to add the new tables to Supabase.

### Option A: Supabase Dashboard (Easiest)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Open the file: `supabase/migrations/004_marketplace_automation.sql`
6. Copy ALL the SQL code
7. Paste into the SQL Editor
8. Click **Run** (or press Cmd+Enter)

You should see:
```
Success. No rows returned
```

This creates:
- ✅ `marketplace_credentials` table (stores encrypted login info)
- ✅ `listing_automation_results` table (tracks job status)
- ✅ New columns on `listings` table (marketplace URLs)

### Option B: Command Line (Alternative)

```bash
# Get your database URL from Supabase dashboard
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-REF].supabase.co:5432/postgres" \
  < supabase/migrations/004_marketplace_automation.sql
```

### ✅ Verify It Worked

Go to **Table Editor** in Supabase Dashboard. You should see:
- `marketplace_credentials` (new table!)
- `listing_automation_results` (new table!)

---

## Step 2: Install Redis 🔴 (REQUIRED)

Redis is the job queue database. It's required for the worker to run.

### macOS:

```bash
# Install Redis
brew install redis

# Start Redis
brew services start redis

# Verify it's running
redis-cli ping
# Should return: PONG
```

### Windows:

Download from: https://github.com/microsoftarchive/redis/releases

Or use WSL:
```bash
sudo apt-get install redis-server
sudo service redis-server start
redis-cli ping
```

### Don't want to install Redis? Use Cloud Redis (Free)

**Upstash** (Recommended - Free tier):
1. Go to https://upstash.com
2. Sign up (free)
3. Create Redis Database
4. Copy the connection URL

---

## Step 3: Add Environment Variables 📝 (REQUIRED)

Open or create `.env.local`:

```bash
# If using local Redis (from Step 2)
REDIS_URL=redis://127.0.0.1:6379

# OR if using Upstash/Cloud Redis
# REDIS_URL=rediss://default:YOUR_PASSWORD@YOUR_HOST.upstash.io:6379
```

**That's it!** The system will use this to connect to Redis.

---

## Step 4: Start the Worker Process 🤖 (REQUIRED for automation)

The worker processes the automation jobs. **It must be running** for listings to post automatically.

### Terminal 1: Start the Worker

```bash
cd "/Users/johnkeller/My Mac (Johns-MacBook-Pro.local)/Main/Ai-resell-agent"
node scripts/automation-worker.js
```

You should see:
```
🚀 Automation Worker Started
📋 Processing marketplace automation jobs...
🔗 Redis: redis://127.0.0.1:6379

💚 Health check available at http://localhost:3001/health

✅ Worker is ready and waiting for jobs!
Press Ctrl+C to stop
```

**Leave this terminal open!** The worker needs to run continuously.

### Terminal 2: Start Your Next.js App

```bash
npm run dev
```

Now you have:
- ✅ Worker running (Terminal 1)
- ✅ App running (Terminal 2)

---

## Step 5: Test Marketplace Connection 🔌

### 5.1: Navigate to Settings

1. Open http://localhost:3000
2. Login to your account
3. Go to **Settings**
4. Scroll to **"Automated Marketplace Posting"** section

You should see:
- Poshmark (Connect button)
- Mercari (Connect button)
- eBay (Connect button)
- Depop (Connect button)

### 5.2: Connect a Test Account (Poshmark)

**⚠️ IMPORTANT: Use a TEST account, not your main account!**

1. Click **Connect** next to Poshmark
2. Enter:
   - Username: `your_poshmark_username`
   - Password: `your_password`
3. Click **Connect**

You should see:
```
✅ Credentials saved successfully
```

The credentials are now:
- ✅ Encrypted with bcrypt
- ✅ Stored in Supabase
- ✅ Ready for automation

### 5.3: Verify in Database

Go to Supabase → Table Editor → `marketplace_credentials`

You should see your entry:
- `marketplace`: "poshmark"
- `username`: "your_username"
- `password`: "$2a$10$..." (encrypted hash, not plain text!)
- `is_active`: true

---

## Step 6: Test Creating a Listing 📝

### 6.1: Create a Test Listing

1. Go to **Create New Listing**
2. Upload 1-2 test images
3. Fill in:
   - **Title**: "Test Listing - Do Not Buy"
   - **Price**: 10
   - **Category**: "Shoes"
   - **Condition**: "Good"
   - **Description**: "This is a test listing for automation"
4. **Select Poshmark** in the marketplace checkboxes
5. Click **"One Click Post with AI"**

### 6.2: Watch the Worker Terminal

In Terminal 1 (worker), you should see:

```
[Queue] Added job john-poshmark-abc123 to queue
[Queue] Processing job john-poshmark-abc123 for poshmark
[Poshmark] Starting login for user john123
[Poshmark] Logging in...
[Queue] Job john-poshmark-abc123 progress: 10%
[Queue] Job john-poshmark-abc123 progress: 30%
[Poshmark] Creating listing: Test Listing - Do Not Buy
[Queue] Job john-poshmark-abc123 progress: 50%
[Poshmark] Uploading images...
[Poshmark] Setting title...
[Poshmark] Setting description...
[Poshmark] Submitting listing...
[Queue] Job john-poshmark-abc123 progress: 90%
[Poshmark] ✅ Listing created successfully: https://poshmark.com/listing/...
[Queue] Job john-poshmark-abc123 progress: 100%
✅ Job john-poshmark-abc123 completed
```

### 6.3: Check Your Dashboard

Go to your **Dashboard**. You should see:
- Your new listing
- Marketplace status: "Posted to Poshmark ✅"
- Live URL: Click to view on Poshmark

---

## 🐛 Troubleshooting

### "Worker not starting"

**Error**: `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Fix**: Redis isn't running
```bash
brew services start redis
# Or
redis-server
```

---

### "Job stuck in waiting state"

**Cause**: Worker not running

**Fix**: 
```bash
# Start the worker in a new terminal
node scripts/automation-worker.js
```

---

### "Cannot find module '../lib/automation/queue'"

**Cause**: TypeScript not compiled yet

**Fix**:
```bash
npm run build
# Or just run the worker, it uses Node's require
```

---

### "LOGIN_FAILED" error in worker

**Possible causes**:
1. Wrong username/password
2. Account locked
3. Marketplace changed login page

**Fix**:
1. Double-check credentials in Settings
2. Try logging in manually to marketplace first
3. Enable visible browser for debugging:

Edit `lib/automation/bots/poshmark.ts`:
```typescript
this.browser = await createStealthBrowser({ 
  headless: false  // Change from true to false
});
```

Then you can watch the browser and see what's happening!

---

### "CAPTCHA_DETECTED" error

**Cause**: Marketplace showed CAPTCHA

**Expected**: This is normal occasionally

**Fix**:
- Manual: Post the listing manually once
- Automated: Integrate 2captcha service (see AUTOMATION_GUIDE.md)

---

### Job keeps retrying and failing

**Check worker logs** for the exact error

**Common issues**:
1. Marketplace UI changed → Update selectors in bot file
2. Network timeout → Increase timeout in `safeNavigate()`
3. Account banned → Use different account

---

### Worker shows "unhealthy" in health check

```bash
curl http://localhost:3001/health
```

If it returns error:
- Worker crashed → Check terminal for error
- Redis down → Restart Redis
- Queue corrupted → Flush Redis: `redis-cli FLUSHALL`

---

## ✅ Success Checklist

Before calling it done, verify:

- [ ] Database migration ran successfully
- [ ] Redis is installed and running
- [ ] Environment variables set in `.env.local`
- [ ] Worker process starts without errors
- [ ] Can connect marketplace account in Settings
- [ ] Credentials show as encrypted in database
- [ ] Can create a test listing
- [ ] Job appears in worker logs
- [ ] Listing posts to marketplace successfully
- [ ] Dashboard shows live marketplace URL

---

## 🚀 What to Test First

### Safest Test Path:

1. **Start with Mercari** (less strict bot detection)
2. **Use a brand new test account** (not your main account)
3. **Post 1 listing** to verify it works
4. **Wait 30 minutes**, then post another
5. **Monitor for any account warnings**

### What NOT to Do:

❌ Don't post 50 listings at once (will get flagged)
❌ Don't use your main account for first test
❌ Don't ignore CAPTCHA errors (solve them!)
❌ Don't run multiple workers with same credentials

---

## 📊 Monitoring Your Tests

### Check Job Status (Manual)

```bash
# In browser console on any page
fetch('/api/automation/job-status/YOUR-JOB-ID')
  .then(r => r.json())
  .then(console.log)
```

### Check Queue Stats

Add this to a test page:
```typescript
import { getQueueStats } from '@/lib/automation/queue';

const stats = await getQueueStats();
console.log(stats);
// { waiting: 0, active: 1, completed: 5, failed: 0 }
```

### Check Redis Directly

```bash
redis-cli

# List all jobs
KEYS bull:listing-automation:*

# Get job details
HGETALL bull:listing-automation:1
```

---

## 🎯 Next Steps After Testing

Once everything works:

1. **Add more marketplaces** (eBay, Depop, etc.)
2. **Implement CAPTCHA solving** (2captcha integration)
3. **Add rate limiting** (max posts per hour/day)
4. **Setup monitoring** (Sentry, LogRocket)
5. **Deploy worker** to production (Railway, Heroku, VPS)
6. **Add user notifications** (email/SMS when listings posted)
7. **Create dashboard charts** (posts per day, success rate)

---

## 🆘 Still Having Issues?

1. Check worker terminal for detailed errors
2. Enable `headless: false` to watch the browser
3. Look at screenshots in `/tmp/` folder
4. Check Supabase logs for database errors
5. Review `docs/AUTOMATION_GUIDE.md` for detailed docs

Good luck! 🚀
