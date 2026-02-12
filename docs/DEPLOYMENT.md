# Deployment Guide - AI Resell Agent

## Pre-Deployment Checklist

### 1. Environment Setup

#### Required Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Services
OPENROUTER_API_KEY=your-openrouter-key

# Redis (for job queue)
REDIS_URL=redis://your-redis-url

# Security
ENCRYPTION_KEY=your-64-char-hex-key

# Application
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_APP_NAME=AI Resell Agent
```

#### Generate Encryption Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Database Setup

#### Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Create a new project
3. Wait for database provisioning (2-3 minutes)
4. Copy your project URL and API keys

#### Step 2: Run Database Migrations

1. Open Supabase SQL Editor
2. Run the main setup script: `supabase/setup.sql`
3. Run the migrations: `supabase/migrations/001_add_marketplace_credentials.sql`
4. Verify tables were created in Table Editor

#### Step 3: Verify RLS Policies

Check that all policies are active:

```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

Should return policies for:
- profiles
- listings
- marketplace_listings
- marketplace_connections
- marketplace_credentials
- analytics
- ai_generations
- support_tickets

### 3. Redis Setup (Optional)

#### Option 1: Upstash (Recommended)

1. Go to https://upstash.com
2. Create a new Redis database
3. Copy the Redis URL
4. Add to REDIS_URL environment variable

#### Option 2: Local Redis

```bash
docker run -d -p 6379:6379 redis:7-alpine
```

### 4. Vercel Deployment

#### Step 1: Connect Repository

1. Go to https://vercel.com
2. Import your GitHub repository
3. Configure project settings

#### Step 2: Configure Environment Variables

Add all required variables in Vercel dashboard:
- Settings → Environment Variables
- Add for Production, Preview, and Development
- Never commit secrets to git

#### Step 3: Configure Build Settings

- Framework Preset: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm ci`
- Node Version: 20.x

#### Step 4: Deploy

```bash
# Using Vercel CLI
npm i -g vercel
vercel --prod
```

Or push to main branch for automatic deployment.

### 5. Chrome Extension Setup

#### Build Extension

The extension is in `browser-extension/` directory.

#### Update Configuration

1. Edit `manifest.json`
2. Remove localhost URLs
3. Add your production domain to `host_permissions`
4. Update `externally_connectable` matches

```json
{
  "host_permissions": [
    "https://your-domain.com/*"
  ],
  "externally_connectable": {
    "matches": ["https://your-domain.com/*"]
  }
}
```

#### Package Extension

```bash
cd browser-extension
zip -r ai-resell-agent-extension.zip .
```

#### Submit to Chrome Web Store

1. Go to Chrome Web Store Developer Dashboard
2. Pay $5 one-time fee
3. Upload zip file
4. Fill out store listing details
5. Submit for review (2-3 days typically)

### 6. Post-Deployment Configuration

#### Enable Monitoring

1. **Error Tracking**: Set up Sentry
   ```bash
   npm install @sentry/nextjs
   npx @sentry/wizard@latest -i nextjs
   ```

2. **Analytics**: Configure PostHog or Google Analytics

3. **Uptime Monitoring**: Set up UptimeRobot or similar

#### Configure Alerts

Set up alerts for:
- API error rate > 5%
- Response time > 2 seconds
- Database connection failures
- Redis connection failures
- High CPU/memory usage

#### Database Backups

1. Enable automatic backups in Supabase
2. Schedule: Daily at 3 AM UTC
3. Retention: 30 days
4. Test restore procedure

### 7. Performance Optimization

#### Enable CDN

1. Vercel automatically provides CDN
2. Verify assets are served from edge locations
3. Check response headers for `x-vercel-cache`

#### Image Optimization

Images are automatically optimized by Next.js Image component.

#### Bundle Analysis

```bash
npm run build
# Review bundle size in output
```

## Production Health Checks

### Automated Checks

Create `/app/api/health/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const checks = {
    database: false,
    redis: false,
    timestamp: new Date().toISOString(),
  };

  try {
    // Check database
    const supabase = await createClient();
    const { error } = await supabase.from('profiles').select('count').limit(1);
    checks.database = !error;

    // Check Redis (if configured)
    // Add Redis check here if using job queue

    return NextResponse.json({
      status: checks.database ? 'healthy' : 'degraded',
      checks,
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      checks,
      error: 'Health check failed',
    }, { status: 503 });
  }
}
```

### Manual Verification

After deployment, verify:

- [ ] Homepage loads
- [ ] User can sign up
- [ ] User can log in
- [ ] Dashboard displays correctly
- [ ] New listing form works
- [ ] Bulk upload functions
- [ ] Analytics page loads
- [ ] Settings page functional
- [ ] Chrome extension connects
- [ ] API endpoints respond
- [ ] Images upload successfully
- [ ] Database queries execute

## Rollback Procedure

If issues occur after deployment:

### Vercel Rollback

1. Go to Vercel Dashboard
2. Select your project
3. Go to Deployments
4. Find previous stable deployment
5. Click "Promote to Production"

### Database Rollback

```sql
-- If migration causes issues
-- Restore from backup
-- Or manually revert changes
```

### Emergency Contacts

- DevOps Lead: [contact info]
- Database Admin: [contact info]
- Security Team: [contact info]

## Monitoring First 48 Hours

### Critical Metrics to Watch

1. **Error Rate**
   - Target: < 1%
   - Alert if: > 5%

2. **Response Time**
   - Target: < 500ms (p95)
   - Alert if: > 2s

3. **User Signups**
   - Monitor for anomalies
   - Verify email sending

4. **Database Connections**
   - Target: < 80% pool usage
   - Alert if: > 90%

5. **API Usage**
   - Monitor OpenRouter costs
   - Check for unusual patterns

### Daily Review

- Check error logs
- Review performance metrics
- Verify backup completion
- Check security alerts
- Monitor cost/usage

## Troubleshooting

### Build Failures

```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Database Connection Issues

1. Verify SUPABASE_URL is correct
2. Check API keys are valid
3. Verify RLS policies
4. Check connection pool limits

### Extension Not Connecting

1. Verify extension ID matches
2. Check manifest permissions
3. Review console errors
4. Verify externally_connectable

### Performance Issues

1. Check bundle size: `npm run build`
2. Review slow API endpoints
3. Optimize database queries
4. Enable caching where appropriate

## Security Post-Deployment

### Immediate Actions

1. Enable rate limiting
2. Configure WAF (if using Cloudflare)
3. Set up security monitoring
4. Review access logs
5. Test authentication flows

### Weekly Tasks

- Review security logs
- Check for dependency updates
- Monitor failed auth attempts
- Review API usage patterns

### Monthly Tasks

- Rotate API keys
- Review user permissions
- Update dependencies
- Security audit
- Backup verification test

## Support

For deployment support:
- Documentation: [your-docs-url]
- Email: support@[your-domain].com
- Slack: [your-slack-channel]

---

**Version**: 1.0.0  
**Last Updated**: 2026-01-20  
**Next Review**: 2026-02-20
