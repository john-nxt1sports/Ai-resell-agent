# 🔒 Security Best Practices - AI Resell Agent

This document outlines security measures implemented and best practices for maintaining a secure application.

## Table of Contents

- [Authentication & Authorization](#authentication--authorization)
- [Data Protection](#data-protection)
- [API Security](#api-security)
- [Chrome Extension Security](#chrome-extension-security)
- [Infrastructure Security](#infrastructure-security)
- [Security Monitoring](#security-monitoring)
- [Incident Response](#incident-response)

## Authentication & Authorization

### Implemented Measures

1. **Supabase Auth Integration**
   - Email/password authentication with bcrypt hashing
   - OAuth support (Google, GitHub)
   - JWT-based session management
   - Automatic session refresh

2. **Row Level Security (RLS)**
   - All database tables have RLS enabled
   - Users can only access their own data
   - Service role used only for trusted server operations

3. **Password Requirements**
   - Minimum 8 characters
   - Must contain letters and numbers
   - Maximum 128 characters
   - Validated on client and server

### Best Practices

✅ **DO:**
- Always validate user sessions on server-side
- Use HTTPS in production
- Implement session timeout (24 hours default)
- Store tokens in httpOnly cookies
- Rotate service role keys periodically (every 90 days)

❌ **DON'T:**
- Store passwords in plain text
- Expose service role key to client
- Use weak password requirements
- Store sessions in localStorage (XSS risk)

## Data Protection

### Encryption at Rest

1. **Database**: Supabase encrypts all data at rest using AES-256
2. **Sensitive Fields**: Marketplace credentials are hashed before storage
3. **Environment Variables**: Never committed to version control

### Encryption in Transit

1. **HTTPS**: All production traffic uses TLS 1.2+
2. **Database Connections**: Supabase connections use SSL
3. **API Calls**: All external API calls use HTTPS

### Sensitive Data Handling

**What is Sensitive:**
- API keys and secrets
- User passwords
- OAuth tokens
- Session cookies
- Payment information
- Personal identifiable information (PII)

**How We Protect It:**
```typescript
// ✅ GOOD: Sanitize before logging
logger.info("User logged in", { 
  userId: user.id,  // ID is OK
  email: "***@***.com"  // Redacted
});

// ❌ BAD: Logging sensitive data
console.log("User data:", user);  // May contain sensitive fields
```

### Data Retention

1. **User Data**: Retained until account deletion
2. **Logs**: 90 days retention
3. **Analytics**: Aggregated data only, no PII
4. **Deleted Accounts**: CASCADE DELETE removes all related data

## API Security

### Rate Limiting

Implemented on all endpoints:

```typescript
// AI endpoints: 100 requests/hour per user
RATE_LIMITS.AI_GENERATE

// Auth endpoints
RATE_LIMITS.AUTH_LOGIN  // 10 attempts per 15 minutes
RATE_LIMITS.AUTH_SIGNUP // 5 attempts per hour

// Public API: 1000 requests/hour per IP
RATE_LIMITS.PUBLIC_API
```

### Input Validation

All API inputs are validated:

```typescript
// Example validation
validateEmail(email);
validatePassword(password);
validateUUID(userId);
validateListingTitle(title);
sanitizeString(description);
```

### CSRF Protection

State-changing operations require CSRF tokens:

```typescript
// Client gets token
const { token } = await fetch('/api/csrf').then(r => r.json());

// Client includes token in requests
fetch('/api/listings', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': token
  },
  body: JSON.stringify(listing)
});
```

### SQL Injection Prevention

- ✅ All queries use parameterized statements (Supabase client)
- ✅ No raw SQL with user input
- ✅ RLS policies prevent unauthorized access

### XSS Prevention

```typescript
// Input sanitization
const clean = sanitizeString(userInput);

// React auto-escapes by default
<div>{userInput}</div>  // Safe

// When using dangerouslySetInnerHTML (avoid if possible)
<div dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(userInput)
}} />
```

## Chrome Extension Security

### Manifest V3 Security

```json
{
  "manifest_version": 3,
  "permissions": [
    "storage",      // Minimal permissions
    "tabs",
    "activeTab", 
    "scripting"
  ],
  "host_permissions": [
    // Specific domains only, no wildcards
    "https://poshmark.com/*",
    "https://www.mercari.com/*"
  ]
}
```

### Message Passing Security

```javascript
// ✅ GOOD: Validate message source
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  // Verify sender is from allowed domain
  if (!isAllowedOrigin(sender.origin)) {
    return;
  }
  
  // Validate message structure
  if (!validateMessage(message)) {
    return;
  }
  
  handleMessage(message);
});

// ❌ BAD: Trust any message
chrome.runtime.onMessage.addListener((message) => {
  eval(message.code);  // NEVER DO THIS
});
```

### Content Script Security

```javascript
// ✅ GOOD: Isolated world
const data = document.getElementById('data').textContent;
chrome.runtime.sendMessage({ data });

// ❌ BAD: Sharing objects with page
window.myExtensionAPI = {
  apiKey: 'secret'  // Never expose secrets
};
```

## Infrastructure Security

### Environment Variables

**Production Checklist:**

- [ ] All secrets in environment variables (not code)
- [ ] Service role key never exposed to client
- [ ] `.env` files in `.gitignore`
- [ ] Environment validated at startup
- [ ] Placeholder values rejected in production

### Security Headers

Implemented in `next.config.js`:

```javascript
headers: [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  }
]
```

### CORS Configuration

```typescript
// Supabase dashboard → Authentication → URL Configuration
// Allowed redirect URLs:
// - https://your-domain.com/*
// - https://your-domain.com/auth/callback

// Extension manifest → externally_connectable
"matches": [
  "https://your-domain.com/*"
  // No wildcards, specific domains only
]
```

### Docker Security

```dockerfile
# ✅ GOOD: Non-root user
RUN adduser --system --uid 1001 nextjs
USER nextjs

# ✅ GOOD: Minimal base image
FROM node:18-alpine

# ✅ GOOD: Health check
HEALTHCHECK CMD curl -f http://localhost:3000/api/health
```

## Security Monitoring

### Logging

Structured logging with sensitive data redaction:

```typescript
// Automatically redacts sensitive fields
logger.security("Failed login attempt", {
  email: user.email,
  ip: request.ip,
  userAgent: request.headers['user-agent']
});
```

### Security Events to Monitor

1. **Authentication Events**
   - Failed login attempts (>3 in 15 minutes)
   - New user registrations
   - Password reset requests
   - Session invalidation

2. **Authorization Events**
   - Access denied errors
   - RLS policy violations
   - Permission escalation attempts

3. **API Events**
   - Rate limit exceeded
   - Invalid CSRF tokens
   - SQL injection attempts (malformed queries)
   - Unusual traffic patterns

4. **Data Events**
   - Bulk data exports
   - Account deletion requests
   - Sensitive data access

### Alerting Rules

Set up alerts for:

```yaml
- High rate of 401/403 errors (>10/minute)
- Failed login attempts from single IP (>5/minute)
- Unusual API usage patterns
- Database connection failures
- Service outages
- Security exceptions in logs
```

### Tools

- **Error Tracking**: Sentry (set `SENTRY_DSN`)
- **Log Aggregation**: CloudWatch, DataDog, or similar
- **Uptime Monitoring**: UptimeRobot, Pingdom
- **Security Scanning**: Snyk, Dependabot

## Incident Response

### If a Security Breach is Detected

1. **Immediate Actions** (0-1 hour)
   - [ ] Isolate affected systems
   - [ ] Revoke compromised credentials
   - [ ] Enable maintenance mode if needed
   - [ ] Notify security team

2. **Assessment** (1-4 hours)
   - [ ] Determine scope of breach
   - [ ] Identify affected users
   - [ ] Collect forensic data
   - [ ] Document timeline

3. **Containment** (4-24 hours)
   - [ ] Patch vulnerabilities
   - [ ] Rotate all API keys and secrets
   - [ ] Force password reset for affected users
   - [ ] Review access logs

4. **Recovery** (24-72 hours)
   - [ ] Restore from clean backups if needed
   - [ ] Verify systems are secure
   - [ ] Monitor for continued attack
   - [ ] Update security measures

5. **Post-Incident** (1 week)
   - [ ] Conduct post-mortem
   - [ ] Update security documentation
   - [ ] Implement preventive measures
   - [ ] Train team on lessons learned

### Credential Rotation Procedure

If credentials are compromised:

```bash
# 1. Generate new credentials
# - Supabase: Dashboard → Settings → API → "Generate new keys"
# - OpenRouter: openrouter.ai/keys → "Create new key"
# - Redis: Provider dashboard → "Rotate password"

# 2. Update environment variables
# Vercel: Dashboard → Settings → Environment Variables
# Self-hosted: Update .env file

# 3. Redeploy application
git push origin main  # Vercel auto-deploys
# OR
pm2 restart all  # Self-hosted

# 4. Verify new credentials work
curl https://your-domain.com/api/health

# 5. Revoke old credentials
# - Delete old API keys from providers
# - Update documentation
```

### Contact Information

**Security Team:**
- Email: security@your-domain.com
- Emergency: [Phone number]

**External Resources:**
- Supabase Status: [status.supabase.com](https://status.supabase.com)
- OpenRouter Status: [openrouter.ai/status](https://openrouter.ai/status)

## Security Checklist

Use this checklist before deployment:

### Authentication
- [ ] Supabase Auth configured
- [ ] RLS policies enabled on all tables
- [ ] Strong password requirements enforced
- [ ] OAuth providers configured (if used)
- [ ] Session timeout set appropriately
- [ ] Password reset flow tested

### Data Protection
- [ ] All secrets in environment variables
- [ ] `.env` files in `.gitignore`
- [ ] Sensitive data encrypted at rest
- [ ] HTTPS enabled in production
- [ ] Database backups configured
- [ ] Data retention policies defined

### API Security
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] CSRF protection on state-changing ops
- [ ] SQL injection prevention verified
- [ ] XSS prevention measures in place
- [ ] Error messages don't leak info

### Infrastructure
- [ ] Security headers configured
- [ ] CORS properly configured
- [ ] Docker runs as non-root user
- [ ] Health checks implemented
- [ ] Monitoring and alerting set up
- [ ] Incident response plan documented

### Chrome Extension
- [ ] Minimal permissions requested
- [ ] Message passing validated
- [ ] No secrets in extension code
- [ ] Content scripts isolated
- [ ] Production URLs configured

### Monitoring
- [ ] Error tracking configured (Sentry)
- [ ] Structured logging enabled
- [ ] Security event logging in place
- [ ] Uptime monitoring configured
- [ ] Alert rules defined

## Regular Security Tasks

### Weekly
- [ ] Review error logs for anomalies
- [ ] Check rate limit metrics
- [ ] Review failed login attempts

### Monthly
- [ ] Update dependencies (`npm audit fix`)
- [ ] Review access logs
- [ ] Test backup restoration
- [ ] Review security alerts

### Quarterly
- [ ] Rotate API keys and secrets
- [ ] Security audit of code changes
- [ ] Review and update RLS policies
- [ ] Penetration testing (if applicable)
- [ ] Security training for team

### Annually
- [ ] Comprehensive security audit
- [ ] Disaster recovery drill
- [ ] Review incident response plan
- [ ] Update security documentation
- [ ] Third-party security assessment

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [Supabase Security](https://supabase.com/docs/guides/platform/security)
- [Chrome Extension Security](https://developer.chrome.com/docs/extensions/mv3/security/)
- [CWE Top 25](https://cwe.mitre.org/top25/archive/2023/2023_top25_list.html)
