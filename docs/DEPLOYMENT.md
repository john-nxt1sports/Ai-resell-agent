# 🚀 Deployment Guide - AI Resell Agent

This guide covers deploying the AI Resell Agent application to production.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Deployment Options](#deployment-options)
  - [Vercel (Recommended)](#vercel-deployment)
  - [Docker Deployment](#docker-deployment)
  - [Self-Hosted](#self-hosted-deployment)
- [Post-Deployment](#post-deployment)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying, ensure you have:

1. **Supabase Account** - [Sign up at supabase.com](https://supabase.com)
2. **Redis Instance** - [Upstash](https://upstash.com) or [Redis Cloud](https://redis.com/cloud/)
3. **OpenRouter API Key** - [Get key from openrouter.ai](https://openrouter.ai/keys)
4. **Domain Name** (optional but recommended)

## Environment Setup

### 1. Create Supabase Project

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the SQL script in `supabase/setup.sql` in the SQL Editor
3. Note your project URL and keys:
   - Project URL: `https://your-project.supabase.co`
   - Anon Key: `eyJhbG...` (public, safe to expose)
   - Service Role Key: `eyJhbG...` (SECRET, server-side only)

### 2. Set Up Redis

**Option A: Upstash (Recommended for Serverless)**
1. Create account at [upstash.com](https://upstash.com)
2. Create a Redis database
3. Copy the Redis URL: `redis://default:xxx@xxx.upstash.io:6379`

**Option B: Redis Cloud**
1. Create account at [redis.com/cloud](https://redis.com/cloud/)
2. Create a database
3. Copy connection string

### 3. Get OpenRouter API Key

1. Sign up at [openrouter.ai](https://openrouter.ai)
2. Go to [Keys](https://openrouter.ai/keys)
3. Create a new API key
4. Add credits to your account

## Deployment Options

### Vercel Deployment (Recommended)

Vercel is the easiest way to deploy Next.js applications.

#### Step 1: Prepare Repository

```bash
# Ensure all changes are committed
git add .
git commit -m "Prepare for deployment"
git push origin main
```

#### Step 2: Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Import Project"
3. Select your GitHub repository
4. Configure project settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: ./
   - **Build Command**: `npm run build`
   - **Output Directory**: Leave default

#### Step 3: Configure Environment Variables

Add the following environment variables in Vercel dashboard:

**Required:**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENROUTER_API_KEY=your-openrouter-key
REDIS_URL=redis://your-redis-url
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**Optional but Recommended:**
```
LOG_LEVEL=info
STRUCTURED_LOGGING=true
RATE_LIMIT_AI_REQUESTS_PER_HOUR=100
RATE_LIMIT_PUBLIC_REQUESTS_PER_HOUR=1000
SENTRY_DSN=your-sentry-dsn
```

#### Step 4: Deploy

1. Click "Deploy"
2. Wait for build to complete (2-5 minutes)
3. Visit your application URL

#### Step 5: Configure Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update `NEXT_PUBLIC_APP_URL` to your custom domain

### Docker Deployment

Deploy using Docker and Docker Compose.

#### Step 1: Create Environment File

```bash
# Create .env file with production values
cp .env.example .env

# Edit .env with your production values
nano .env
```

#### Step 2: Build and Run

```bash
# Build the Docker image
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app
```

#### Step 3: Verify Deployment

```bash
# Check health endpoint
curl http://localhost:3000/api/health

# Check all containers are running
docker-compose ps
```

### Self-Hosted Deployment

Deploy on your own server (VPS, AWS EC2, etc.).

#### Step 1: Server Prerequisites

```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx for reverse proxy
sudo apt-get install nginx
```

#### Step 2: Clone and Install

```bash
# Clone repository
git clone https://github.com/your-org/Ai-resell-agent.git
cd Ai-resell-agent

# Install dependencies
npm ci --only=production

# Create environment file
cp .env.example .env
nano .env  # Edit with your values

# Build application
npm run build
```

#### Step 3: Configure PM2

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'ai-resell-agent',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      instances: 2,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
    },
    {
      name: 'automation-worker',
      script: 'npm',
      args: 'run worker',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      watch: false,
    },
  ],
};
```

Start with PM2:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow instructions to enable auto-start
```

#### Step 4: Configure Nginx

Create `/etc/nginx/sites-available/ai-resell-agent`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/ai-resell-agent /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Step 5: Set Up SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is set up automatically
```

## Post-Deployment

### 1. Verify Deployment

```bash
# Check health endpoint
curl https://your-domain.com/api/health

# Expected response:
# {"status":"healthy","timestamp":"...","version":"1.0.0","checks":{...}}
```

### 2. Test Authentication

1. Navigate to `/auth/signup`
2. Create a test account
3. Verify email confirmation (if enabled)
4. Log in and test core features

### 3. Test Chrome Extension

1. Update extension manifest with production URL
2. Load extension in Chrome
3. Test connection to web app
4. Test listing automation

### 4. Configure Supabase Settings

1. **Authentication Settings**:
   - Add your production URL to allowed redirect URLs
   - Configure email templates
   - Set up OAuth providers (Google, GitHub)

2. **Storage Settings**:
   - Review storage bucket policies
   - Enable CDN for image serving

3. **Database Settings**:
   - Review connection pooling settings
   - Set up automated backups

## Monitoring

### Health Checks

Set up monitoring for:

```bash
# Application health
GET /api/health

# Expected: 200 OK
# Response: {"status":"healthy",...}
```

### Logging

Configure log aggregation:

1. **Vercel**: Built-in logging in dashboard
2. **Self-hosted**: Use PM2 logs or configure external service:

```bash
# View PM2 logs
pm2 logs ai-resell-agent

# Configure Sentry
# Add SENTRY_DSN to environment variables
```

### Performance Monitoring

Monitor key metrics:

- Response times (<200ms for API endpoints)
- Error rates (<1%)
- Database query times (<100ms)
- Memory usage
- CPU usage

### Recommended Tools

- **Uptime Monitoring**: [UptimeRobot](https://uptimerobot.com), [Pingdom](https://pingdom.com)
- **Error Tracking**: [Sentry](https://sentry.io)
- **Performance**: [New Relic](https://newrelic.com), [DataDog](https://datadoghq.com)
- **Analytics**: [Vercel Analytics](https://vercel.com/analytics), [Google Analytics](https://analytics.google.com)

## Troubleshooting

### Build Failures

**Issue**: Build fails with "Environment variable not found"

**Solution**: Ensure all required environment variables are set:
```bash
# Check which variables are missing
npm run build 2>&1 | grep "Environment"

# Add missing variables to .env.local or deployment platform
```

**Issue**: Build fails with "Module not found"

**Solution**:
```bash
# Clean install dependencies
rm -rf node_modules package-lock.json
npm install
```

### Runtime Errors

**Issue**: "Database connection failed"

**Solution**:
1. Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
2. Check Supabase project is active
3. Verify RLS policies are set up
4. Check network connectivity

**Issue**: "Redis connection failed"

**Solution**:
1. Verify `REDIS_URL` is correct
2. Check Redis instance is running
3. Verify network/firewall rules allow connection
4. Test connection: `redis-cli -u $REDIS_URL ping`

**Issue**: "AI API errors"

**Solution**:
1. Verify `OPENROUTER_API_KEY` is correct
2. Check API key has credits
3. Review rate limits
4. Check API status: [openrouter.ai/status](https://openrouter.ai/status)

### Performance Issues

**Issue**: Slow page loads

**Solution**:
1. Check CDN is enabled for static assets
2. Review database query performance
3. Enable Next.js caching
4. Optimize images (use WebP/AVIF)
5. Check network latency

**Issue**: High memory usage

**Solution**:
1. Increase memory limits (PM2/Docker)
2. Review memory leaks in custom code
3. Enable garbage collection logging
4. Consider horizontal scaling

### Security Issues

**Issue**: "CORS errors"

**Solution**:
1. Add your domain to allowed origins in Supabase dashboard
2. Update Chrome extension manifest with production URL
3. Verify `NEXT_PUBLIC_APP_URL` is correct

**Issue**: "CSRF token validation failed"

**Solution**:
1. Ensure cookies are enabled
2. Check `SameSite` cookie settings
3. Verify HTTPS is enabled in production
4. Check time sync on servers

## Rollback Procedure

If deployment fails:

### Vercel

1. Go to Deployments tab
2. Find last working deployment
3. Click "Promote to Production"

### Docker

```bash
# Stop current containers
docker-compose down

# Check out previous version
git checkout <previous-commit>

# Rebuild and restart
docker-compose up -d --build
```

### PM2

```bash
# List previous deployments
pm2 list

# Revert to previous commit
git checkout <previous-commit>
npm run build
pm2 restart all
```

## Support

For deployment issues:

1. Check [Troubleshooting](#troubleshooting) section
2. Review application logs
3. Check [GitHub Issues](https://github.com/your-org/Ai-resell-agent/issues)
4. Contact support team

## Next Steps

After successful deployment:

1. ✅ Set up monitoring and alerting
2. ✅ Configure automated backups
3. ✅ Set up CI/CD pipeline
4. ✅ Review and optimize performance
5. ✅ Plan scaling strategy
6. ✅ Document operational procedures
