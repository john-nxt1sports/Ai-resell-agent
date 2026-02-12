# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in AI Resell Agent, please report it by emailing security@[your-domain].com. Please do not open public issues for security vulnerabilities.

### What to Include

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Suggested fix (if any)

We will acknowledge your email within 48 hours and provide a detailed response within 7 days.

## Security Measures

### Authentication & Authorization

- **Supabase Auth** with JWT tokens
- **Row Level Security (RLS)** on all database tables
- **Session management** with automatic token refresh
- **OAuth support** for Google and GitHub

### Data Encryption

- **AES-256-GCM encryption** for sensitive data (cookies, session data)
- **PBKDF2 key derivation** with 100,000 iterations
- **TLS/HTTPS** for all data in transit
- **Environment-based encryption keys** (never committed to source control)

### API Security

- **Authentication required** on all protected endpoints
- **Rate limiting** to prevent abuse
- **Input validation** on all user inputs
- **Parameterized queries** to prevent SQL injection
- **CORS policy** restricted to allowed origins

### Headers & CSP

- **Content Security Policy (CSP)** headers
- **X-Frame-Options** to prevent clickjacking
- **X-Content-Type-Options** to prevent MIME sniffing
- **Strict-Transport-Security** for HTTPS enforcement
- **Referrer-Policy** for privacy

### Chrome Extension Security

- **Manifest V3** compliance
- **Minimum necessary permissions**
- **Content script isolation**
- **Secure message passing** between components
- **No eval() or unsafe-inline** scripts

## Best Practices for Users

### API Keys

1. Never commit API keys to version control
2. Use environment variables for all secrets
3. Rotate keys regularly (every 90 days minimum)
4. Use different keys for development and production
5. Monitor API usage for anomalies

### Database

1. Enable Row Level Security on all tables
2. Use service role key only on server-side
3. Regular backups (daily recommended)
4. Monitor for unusual query patterns
5. Keep Supabase client libraries up to date

### Deployment

1. Use HTTPS only in production
2. Enable Vercel's DDoS protection
3. Set up error monitoring (Sentry)
4. Configure proper CORS policies
5. Implement rate limiting

### Browser Extension

1. Only install from Chrome Web Store
2. Review permissions before installing
3. Keep extension updated
4. Use separate browser profile for automation
5. Never share session cookies

## Security Checklist for Production

### Before Deployment

- [ ] All environment variables configured
- [ ] Encryption key generated and stored securely
- [ ] Database RLS policies verified
- [ ] API rate limiting enabled
- [ ] Security headers configured
- [ ] CORS policies restrictive
- [ ] No console.log in production code
- [ ] No hardcoded credentials
- [ ] Dependencies audited (npm audit)
- [ ] TypeScript strict mode enabled

### After Deployment

- [ ] HTTPS verified
- [ ] CSP headers active
- [ ] Rate limiting working
- [ ] Error tracking configured
- [ ] Database backups scheduled
- [ ] Monitoring alerts set up
- [ ] Security scan passed
- [ ] Penetration testing completed

## Vulnerability Disclosure Timeline

1. **Day 0**: Vulnerability reported
2. **Day 2**: Acknowledgment sent
3. **Day 7**: Initial assessment complete
4. **Day 30**: Fix deployed (target)
5. **Day 90**: Public disclosure (coordinated)

## Security Updates

Security patches will be released as soon as possible after a vulnerability is confirmed. Critical security updates will be announced via:

- GitHub Security Advisories
- Email notifications to registered users
- Security section of documentation

## Compliance

This application follows security best practices including:

- OWASP Top 10 guidelines
- GDPR data protection requirements
- SOC 2 security principles
- Chrome Web Store security policies

## Third-Party Services

We use the following third-party services with their own security policies:

- **Supabase** - Database and authentication
- **OpenRouter** - AI API gateway
- **Vercel** - Hosting and deployment
- **Redis** - Job queue (optional)

Please review their security policies:
- Supabase: https://supabase.com/security
- Vercel: https://vercel.com/security
- OpenRouter: https://openrouter.ai/docs

## Contact

For security concerns, please contact:
- Email: security@[your-domain].com
- GitHub: Open a private security advisory

---

Last updated: 2026-01-20
