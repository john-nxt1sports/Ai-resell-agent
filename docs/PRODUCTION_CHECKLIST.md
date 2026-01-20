# 🚀 Production Setup Checklist

This checklist ensures your AI Resell Agent application is production-ready.

## Pre-Deployment Checklist

### ✅ Environment Configuration

- [ ] **Copy environment template**
  ```bash
  cp .env.example .env.local
  ```

- [ ] **Supabase Setup**
  - [ ] Create Supabase project at [supabase.com](https://supabase.com)
  - [ ] Run `supabase/setup.sql` in SQL Editor
  - [ ] Set `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] Set `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] Set `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)
  - [ ] Configure authentication redirect URLs
  - [ ] Review RLS policies

- [ ] **Redis Setup**
  - [ ] Create Redis instance ([Upstash](https://upstash.com) recommended)
  - [ ] Set `REDIS_URL`
  - [ ] Test connection: `redis-cli -u $REDIS_URL ping`

- [ ] **AI Services**
  - [ ] Get OpenRouter API key from [openrouter.ai](https://openrouter.ai/keys)
  - [ ] Set `OPENROUTER_API_KEY`
  - [ ] Add credits to OpenRouter account
  - [ ] Test API access

- [ ] **Application URLs**
  - [ ] Set `NEXT_PUBLIC_APP_URL` to production domain
  - [ ] Set `NEXT_PUBLIC_SITE_URL`
  - [ ] Update Chrome extension manifest with production URL

- [ ] **Optional but Recommended**
  - [ ] Set up error tracking (Sentry): `SENTRY_DSN`
  - [ ] Configure rate limits: `RATE_LIMIT_*`
  - [ ] Set log level: `LOG_LEVEL=info` or `warn`
  - [ ] Enable structured logging: `STRUCTURED_LOGGING=true`

### ✅ Security Configuration

- [ ] **Environment Variables**
  - [ ] Verify no secrets committed to git
  - [ ] All `.env*` files in `.gitignore`
  - [ ] Service role key never exposed to client
  - [ ] No placeholder values in production

- [ ] **Authentication**
  - [ ] Email confirmation enabled (Supabase dashboard)
  - [ ] OAuth providers configured (if using)
  - [ ] Password requirements enforced
  - [ ] Session timeout configured
  - [ ] Test signup/login flows

- [ ] **Database Security**
  - [ ] RLS enabled on all tables (verify with `setup.sql`)
  - [ ] Service role used only server-side
  - [ ] Test user can only access own data
  - [ ] Backup policy configured

- [ ] **API Security**
  - [ ] Rate limiting active (check route files)
  - [ ] CSRF protection enabled
  - [ ] Input validation on all endpoints
  - [ ] Security headers configured
  - [ ] CORS properly restricted

### ✅ Application Testing

- [ ] **Build Test**
  ```bash
  npm run build
  # Should complete without errors
  ```

- [ ] **Type Check**
  ```bash
  npm run type-check
  # Should have no TypeScript errors
  ```

- [ ] **Environment Validation**
  ```bash
  # Verify env validation runs at startup
  npm run dev
  # Should see: "✅ Environment variables validated successfully"
  ```

- [ ] **Health Check**
  ```bash
  curl http://localhost:3000/api/health
  # Should return: {"status":"healthy",...}
  ```

- [ ] **API Endpoints**
  - [ ] Test auth signup/login
  - [ ] Test AI listing generation
  - [ ] Test marketplace connection
  - [ ] Test Chrome extension communication

- [ ] **User Flows**
  - [ ] Create account
  - [ ] Generate listing
  - [ ] Connect marketplace
  - [ ] View analytics
  - [ ] Update settings
  - [ ] Delete account

### ✅ Chrome Extension

- [ ] **Configuration**
  - [ ] Update manifest.json with production URLs
  - [ ] Remove any development-only permissions
  - [ ] Set correct version number
  - [ ] Verify icons are included (16, 32, 48, 128px)

- [ ] **Testing**
  - [ ] Load extension in Chrome
  - [ ] Test connection to web app
  - [ ] Test listing automation
  - [ ] Test error handling
  - [ ] Verify no console errors

- [ ] **Store Preparation** (Manual - Out of Scope)
  - [ ] Prepare store listing
  - [ ] Create screenshots
  - [ ] Write description
  - [ ] Set privacy policy URL
  - [ ] Submit for review

### ✅ Monitoring Setup

- [ ] **Error Tracking**
  - [ ] Sentry or similar configured
  - [ ] Test error reporting
  - [ ] Set up alert rules

- [ ] **Uptime Monitoring**
  - [ ] Configure uptime monitor (UptimeRobot, Pingdom)
  - [ ] Monitor `/api/health` endpoint
  - [ ] Set up notifications

- [ ] **Logging**
  - [ ] Structured logging enabled
  - [ ] Log aggregation configured (optional)
  - [ ] No sensitive data in logs

- [ ] **Performance**
  - [ ] Set up APM (optional)
  - [ ] Monitor API response times
  - [ ] Track database query performance

### ✅ Documentation

- [ ] **Team Documentation**
  - [ ] README.md updated
  - [ ] DEPLOYMENT.md reviewed
  - [ ] SECURITY.md reviewed
  - [ ] Environment variables documented
  - [ ] API endpoints documented

- [ ] **Operations**
  - [ ] Deployment procedure documented
  - [ ] Rollback procedure tested
  - [ ] Incident response plan in place
  - [ ] On-call rotation defined (if applicable)

### ✅ Deployment

- [ ] **Choose Deployment Method**
  - [ ] Vercel (easiest for Next.js)
  - [ ] Docker (using provided Dockerfile)
  - [ ] Self-hosted (using provided guides)

- [ ] **Pre-Deploy**
  - [ ] All tests passing
  - [ ] Build succeeds locally
  - [ ] Git repository clean
  - [ ] Tagged release version

- [ ] **Deploy**
  - [ ] Follow deployment guide in `docs/DEPLOYMENT.md`
  - [ ] Verify environment variables set
  - [ ] Monitor deployment logs
  - [ ] Verify successful deployment

- [ ] **Post-Deploy Verification**
  - [ ] Application accessible
  - [ ] Health check returns healthy
  - [ ] Can create account
  - [ ] Can generate listing
  - [ ] Chrome extension connects
  - [ ] No errors in logs

### ✅ Post-Deployment

- [ ] **Monitoring Setup**
  - [ ] Verify error tracking working
  - [ ] Verify uptime monitoring working
  - [ ] Check performance metrics
  - [ ] Review logs

- [ ] **Performance**
  - [ ] Run Lighthouse audit (target 90+ scores)
  - [ ] Test load times on 3G connection
  - [ ] Verify API response times <200ms
  - [ ] Check database query times <100ms

- [ ] **Security Scan**
  - [ ] Run `npm audit`
  - [ ] Check for exposed secrets
  - [ ] Verify HTTPS enforced
  - [ ] Test rate limiting
  - [ ] Verify CSRF protection

- [ ] **Load Testing** (Optional)
  - [ ] Test with expected concurrent users
  - [ ] Verify rate limits work
  - [ ] Check resource usage
  - [ ] Test auto-scaling (if configured)

## Maintenance Schedule

### Daily
- [ ] Review error logs
- [ ] Check uptime status
- [ ] Monitor API usage

### Weekly
- [ ] Review performance metrics
- [ ] Check failed requests
- [ ] Review security alerts
- [ ] Update dependencies (`npm audit fix`)

### Monthly
- [ ] Review and analyze logs
- [ ] Database backup verification
- [ ] Security policy review
- [ ] Cost optimization review

### Quarterly
- [ ] Rotate API keys and secrets
- [ ] Comprehensive security audit
- [ ] Performance optimization
- [ ] Dependency major updates
- [ ] Disaster recovery drill

### Annually
- [ ] Third-party security assessment
- [ ] Full system audit
- [ ] Architecture review
- [ ] Capacity planning

## Emergency Procedures

### If Application is Down

1. **Check Health Endpoint**
   ```bash
   curl https://your-domain.com/api/health
   ```

2. **Check Service Status**
   - Supabase: [status.supabase.com](https://status.supabase.com)
   - Redis provider status page
   - OpenRouter: [openrouter.ai/status](https://openrouter.ai/status)

3. **Review Recent Changes**
   - Check recent deployments
   - Review recent code changes
   - Check environment variable changes

4. **Roll Back if Needed**
   - Vercel: Promote previous deployment
   - Docker: Deploy previous image
   - Self-hosted: Checkout previous commit

### If High Error Rate

1. **Identify Error Pattern**
   - Check error tracking dashboard
   - Review structured logs
   - Identify affected endpoints

2. **Assess Impact**
   - How many users affected?
   - Is data corrupted?
   - Is it a security issue?

3. **Immediate Action**
   - Enable maintenance mode if needed
   - Disable affected features
   - Scale up resources if needed

### If Security Breach Detected

1. **Immediately**
   - Isolate affected systems
   - Revoke compromised credentials
   - Enable maintenance mode
   - Notify security team

2. **Follow Incident Response**
   - See `docs/SECURITY.md` for complete procedure
   - Document all actions
   - Preserve forensic evidence
   - Notify affected users if required

## Support Contacts

- **Technical Lead**: [Email/Phone]
- **Security Team**: security@your-domain.com
- **On-Call**: [Pager/Phone]
- **Vendor Support**:
  - Supabase: support.supabase.com
  - OpenRouter: [Support link]
  - Redis Provider: [Support link]

## Resources

- 📖 [Deployment Guide](docs/DEPLOYMENT.md)
- 🔒 [Security Best Practices](docs/SECURITY.md)
- 🏗️ [Architecture Overview](docs/APP_OVERVIEW.md)
- 🐛 [Troubleshooting](docs/DEPLOYMENT.md#troubleshooting)
- 📊 [Analytics Setup](ANALYTICS_READY.md)

## Completion

Once all items are checked:

✅ **Application is PRODUCTION READY**

Date deployed: ________________
Deployed by: ________________
Deployment method: ________________
Production URL: ________________

---

**Remember**: This checklist should be reviewed and updated regularly as the application evolves and new best practices emerge.
