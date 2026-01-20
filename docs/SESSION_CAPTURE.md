# Session Capture Authentication System

## Overview

We've upgraded the marketplace automation to use **session capture** instead of password storage - exactly how professional tools like Vendoo and Flyp work!

## Why This is Better

### ✅ Works with ANY Login Method
- Google Sign-In
- Facebook Login  
- Apple ID
- Email/Password
- Phone Number
- **ANY authentication method the marketplace supports!**

### ✅ More Secure
- No passwords stored in our database
- Only session cookies (which expire naturally)
- Uses real logged-in sessions
- Less likely to trigger security flags

### ✅ Better User Experience
- Log in once with your preferred method
- We capture your session automatically
- No need to remember/enter passwords
- Works just like using the marketplace normally

## How It Works

```
1. User clicks "Connect Marketplace"
   ↓
2. Browser opens to marketplace (Mercari, Poshmark, etc.)
   ↓
3. User logs in normally (with Google, email, whatever they prefer)
   ↓
4. System detects successful login
   ↓
5. Session cookies are captured and stored
   ↓
6. Automation uses these cookies for future posts
```

## For Users

### Connecting a Marketplace Account

1. **Go to Settings** → Marketplace Connections
2. **Click "Connect"** on the marketplace you want to add
3. **A browser window opens** automatically
4. **Log in normally** using ANY method:
   - "Sign in with Google" ✅
   - "Sign in with Facebook" ✅
   - Email & Password ✅
   - Phone Number ✅
   - Whatever that marketplace supports!
5. **Wait** - the system detects when you're logged in (up to 3 minutes)
6. **Done!** Session captured automatically

### What Gets Stored

- ✅ Session cookies (encrypted)
- ✅ Marketplace identifier
- ❌ **NO** passwords
- ❌ **NO** personal login info

### Session Expiration

Sessions eventually expire (marketplace-dependent, usually 30-90 days). When this happens:
- You'll get a notification
- Just reconnect using the same flow
- Takes ~30 seconds

## For Developers

### Session Capture Flow

```typescript
// lib/automation/session-capture.ts
export async function captureMarketplaceSession(
  marketplace: string,
  userId: string
): Promise<SessionCaptureResult> {
  // 1. Open visible browser (headless: false)
  const browser = await createStealthBrowser({ headless: false });
  
  // 2. Navigate to marketplace
  await page.goto(marketplaceUrl);
  
  // 3. Wait for login detection (marketplace-specific selectors)
  await detectLogin(marketplace, page);
  
  // 4. Capture cookies
  const cookies = await saveCookies(context);
  
  // 5. Store in database
  await saveToDatabase(userId, marketplace, cookies);
  
  return { success: true, cookies };
}
```

### Login Detection

Each marketplace has specific selectors that indicate a logged-in session:

**Mercari:**
```typescript
await page.waitForSelector('[data-testid="UserMenu"], [href="/sell"]');
```

**Poshmark:**
```typescript
await page.waitForSelector('.dropdown__user, [data-test="header-account-menu"]');
```

**eBay:**
```typescript
await page.waitForSelector('#gh-ug, #gh-eb-u');
```

**Depop:**
```typescript
await page.waitForSelector('[data-testid="avatar"]');
```

### Bot Usage

Bots now use cookies-only authentication:

```typescript
// lib/automation/bots/mercari.ts
async login(credentials: MarketplaceCredentials): Promise<void> {
  // No password needed!
  if (!credentials.cookies) {
    throw new Error("Please connect your account in Settings");
  }
  
  // Load cookies and verify session
  await loadCookies(this.context, credentials.cookies);
  await this.page.goto(this.BASE_URL);
  
  const isLoggedIn = await this.verifySession();
  if (!isLoggedIn) {
    throw new Error("Session expired. Please reconnect.");
  }
}
```

### API Endpoints

**POST `/api/automation/capture-session`**
```json
{
  "marketplace": "mercari"
}
```

Response:
```json
{
  "success": true,
  "marketplace": "mercari",
  "message": "Session captured successfully"
}
```

**GET `/api/automation/credentials`**
Returns all connected marketplaces (cookies encrypted, not exposed).

**DELETE `/api/automation/credentials?id={id}`**
Disconnects a marketplace.

## Database Schema

```sql
CREATE TABLE marketplace_credentials (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  marketplace TEXT NOT NULL,
  cookies TEXT NOT NULL,  -- Encrypted session cookies
  password TEXT,          -- Optional (legacy support)
  is_active BOOLEAN,
  last_used TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(user_id, marketplace)
);
```

## Security

### What We Store
- **Session cookies** (encrypted in database)
- Marketplace identifier
- Last used timestamp

### What We DON'T Store
- ❌ Passwords
- ❌ Personal information
- ❌ Payment methods
- ❌ Authentication tokens (OAuth)

### Encryption
- Cookies encrypted at rest in database
- Only decrypted when needed for automation
- Never exposed through API responses

### Session Lifetime
- Cookies expire naturally (marketplace-controlled)
- User can disconnect anytime
- System detects expired sessions and prompts reconnection

## Comparison to Password Auth

| Feature | Session Capture (New) | Password Auth (Old) |
|---------|---------------------|-------------------|
| Works with Google Sign-In | ✅ Yes | ❌ No |
| Works with OAuth | ✅ Yes | ❌ No |
| Stores passwords | ❌ No | ✅ Yes (encrypted) |
| Handles 2FA | ✅ User solves during login | ❌ Blocks automation |
| CAPTCHA handling | ✅ User solves during login | ⚠️ Requires CAPTCHA solver |
| Security flags | ✅ Less likely | ⚠️ More likely |
| User experience | ✅ Easy | ⚠️ Complex |

## Troubleshooting

### Browser Doesn't Open
- Check Playwright is installed: `npx playwright install chromium`
- Verify no conflicting browser processes
- Check system display permissions

### Login Not Detected
- Make sure you're fully logged in (see your profile/dashboard)
- Don't close the browser manually
- Wait up to 3 minutes for detection
- Check browser console for errors

### Session Expires Quickly
- Some marketplaces have shorter session lifetimes
- "Remember me" option during login helps
- May need to reconnect every 30-60 days

### Automation Fails
- Error: "No session cookies" → Need to connect account
- Error: "Session expired" → Reconnect account in Settings
- Check worker logs for specific error messages

## Future Enhancements

1. **Session Refresh** - Auto-refresh cookies before expiration
2. **Multi-Account Support** - Multiple accounts per marketplace
3. **Browser Profiles** - Persistent browser profiles per user
4. **Session Health Check** - Proactive validation and alerts
5. **Mobile App Support** - QR code session transfer

## Migration from Old System

If you have existing password-based credentials:

1. Old passwords will still work temporarily
2. System will prompt to upgrade to session capture
3. Once connected via session, password becomes optional
4. Can delete password data after successful session capture

## Support

- **Documentation**: See `AUTOMATION_GUIDE.md`
- **API Reference**: See `API.md`
- **Examples**: See `examples/` directory
- **Issues**: Check worker logs and health endpoint

---

**Status**: ✅ Production Ready
**Last Updated**: October 16, 2025
**Version**: 2.0 (Session Capture System)
