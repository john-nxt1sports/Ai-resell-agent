# 🔧 Supabase Authentication Setup Guide

## ⚠️ Current Issue

Users are being created in the database but sessions are not being established properly. This is likely due to email confirmation settings.

## 🔍 Diagnosis

When you sign up:

- ✅ User created in `auth.users`
- ✅ Profile created in `public.profiles` (via trigger)
- ❌ Session not established because email confirmation is required

## 🛠️ Solution

### Option 1: Disable Email Confirmation (Recommended for Development)

1. **Go to Supabase Dashboard**

   - Navigate to your project
   - Go to `Authentication` → `Settings`

2. **Disable Email Confirmation**

   - Scroll down to "User Signups"
   - **Uncheck** "Enable email confirmations"
   - Click "Save"

3. **Configure Site URL**

   - In the same Settings page
   - Set `Site URL` to: `http://localhost:3000` (for development)
   - Add to `Redirect URLs`: `http://localhost:3000/auth/callback`

4. **Test Again**
   - Clear your browser cookies/cache
   - Sign up with a new email
   - You should be logged in immediately

### Option 2: Keep Email Confirmation (Production-Ready)

If you want to keep email confirmation enabled:

1. **Configure Email Templates**

   - Go to `Authentication` → `Email Templates`
   - Customize the "Confirm signup" email template
   - Make sure the confirmation link points to: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup`

2. **Set Up Email Service** (if not done)

   - Supabase provides a built-in email service (limited)
   - For production, configure a custom SMTP provider:
     - Go to `Project Settings` → `Auth` → `SMTP Settings`
     - Configure your SMTP provider (SendGrid, AWS SES, etc.)

3. **Update Site URLs**

   - `Site URL`: Your production URL (e.g., `https://your-domain.com`)
   - `Redirect URLs`: Add all callback URLs you need

4. **Test Email Flow**
   - Sign up with a valid email
   - Check your inbox for confirmation email
   - Click the confirmation link
   - You should be redirected and logged in

## 📝 Run Database Setup

Run the SQL setup script to ensure all tables, triggers, and policies are configured:

1. **Open Supabase SQL Editor**

   - Go to your Supabase Dashboard
   - Click on `SQL Editor` in the left sidebar
   - Click `New Query`

2. **Copy and Paste**

   - Open `supabase/setup.sql` from this project
   - Copy all the SQL code
   - Paste it into the SQL Editor

3. **Execute**
   - Click "Run" or press `Ctrl+Enter` (Windows/Linux) or `Cmd+Enter` (Mac)
   - Wait for all statements to complete
   - Check for any errors in the results panel

## 🔑 Environment Variables

Make sure your `.env.local` file has the correct Supabase credentials:

\`\`\`bash

# Get these from your Supabase Project Settings > API

NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
\`\`\`

## 🧪 Testing Authentication

### Test Sign Up Flow:

1. **Clear existing data**
   \`\`\`bash

   # In Supabase Dashboard > Table Editor

   # Delete test users from auth.users and public.profiles

   \`\`\`

2. **Sign up with a new account**

   - Go to `/auth/signup`
   - Fill in the form
   - Submit

3. **Check what happens:**

   **If email confirmation is DISABLED:**

   - ✅ You should be redirected to `/dashboard` immediately
   - ✅ Your session should be active
   - ✅ You can see your profile in Settings

   **If email confirmation is ENABLED:**

   - ✅ You should see an alert to check your email
   - ✅ Check your email inbox
   - ✅ Click the confirmation link
   - ✅ You should be redirected and logged in

### Test Sign In Flow:

1. **Go to `/auth/login`**
2. **Enter your credentials**
3. **Submit**
4. **Should be redirected to `/dashboard`**

## 🐛 Troubleshooting

### Issue: "User not found" error

- **Solution**: Make sure the email is confirmed (check `auth.users.email_confirmed_at`)

### Issue: Profile not created automatically

- **Solution**: Run the setup SQL again, especially the trigger section

### Issue: RLS policy errors

- **Solution**: Check that RLS policies allow the user to insert/select their own data

### Issue: Session not persisting

- **Solution**: Check middleware configuration and cookie settings

## 📚 Additional Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Email Configuration](https://supabase.com/docs/guides/auth/auth-email)
- [RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)

## ✅ Verification Checklist

- [ ] Database tables created
- [ ] RLS policies enabled
- [ ] Triggers configured (handle_new_user)
- [ ] Email confirmation settings configured
- [ ] Site URL and Redirect URLs configured
- [ ] Environment variables set
- [ ] Test sign up successful
- [ ] Test sign in successful
- [ ] Profile created automatically
- [ ] Session persists after refresh

---

**Need Help?** If you're still experiencing issues after following this guide, check:

1. Browser console for JavaScript errors
2. Network tab for failed API requests
3. Supabase logs in Dashboard > Logs
