# Chrome Web Store Submission Guide

## 📋 Pre-Submission Checklist

### 1. Extension Icons (REQUIRED)

Generate the PNG icons before submission:

```bash
# Option A: Install canvas and run script
cd browser-extension
npm install canvas
node scripts/generate-icons.js

# Option B: Use ImageMagick
cd browser-extension/icons
convert -size 128x128 gradient:'#6366f1'-'#8b5cf6' -fill white -gravity center \
  -font Arial-Bold -pointsize 56 -annotate 0 'AI' icon128.png
convert icon128.png -resize 48x48 icon48.png
convert icon128.png -resize 32x32 icon32.png
convert icon128.png -resize 16x16 icon16.png

# Option C: Use online SVG to PNG converter
# Open the generated .svg files in browser-extension/icons/
# Convert at: https://svgtopng.com/ or https://cloudconvert.com/
```

### 2. Test Locally First

```bash
# 1. Open Chrome and go to chrome://extensions
# 2. Enable "Developer mode" (top right)
# 3. Click "Load unpacked"
# 4. Select the browser-extension folder
# 5. Test all marketplace integrations
```

### 3. Required Store Listing Assets

| Asset              | Size                | Notes                     |
| ------------------ | ------------------- | ------------------------- |
| Small promo tile   | 440x280 px          | Shows in Chrome Web Store |
| Large promo tile   | 920x680 px          | Shows when featured       |
| Marquee promo tile | 1400x560 px         | Hero banner (optional)    |
| Screenshots        | 1280x800 or 640x400 | At least 1, up to 5       |

### 4. Store Listing Information

**Extension Name:** ListingsAI - Multi-Marketplace Poster

**Short Description (132 chars max):**

```
Automatically post listings to Poshmark, Mercari & eBay. AI-powered cross-posting saves hours. No passwords needed!
```

**Detailed Description:**

```
🚀 ListingsAI - The Smartest Way to Cross-Post Your Listings

Stop wasting hours manually posting to multiple marketplaces. ListingsAI automatically posts your listings to Poshmark, Mercari, and eBay with just one click.

✨ KEY FEATURES:

• ONE-CLICK CROSS-POSTING
Create a listing once, post it everywhere. Our AI optimizes your title and description for each marketplace.

• NO PASSWORDS REQUIRED
Uses your existing logged-in browser sessions. We never ask for or store your marketplace credentials.

• AI-POWERED OPTIMIZATION
Our AI enhances your listings with better titles, descriptions, and tags for maximum visibility.

• REAL-TIME STATUS
See which marketplaces you're logged into and track posting progress in real-time.

• SECURE & PRIVATE
All automation happens locally in your browser. Your data never leaves your computer.

📱 SUPPORTED MARKETPLACES:
• Poshmark
• Mercari
• eBay
• More coming soon!

🔒 PRIVACY FIRST:
- We never store your marketplace passwords
- All operations happen in YOUR browser
- Your listings stay on YOUR computer
- Open source and auditable

💡 HOW IT WORKS:
1. Install the extension
2. Log into your marketplaces in Chrome
3. Create listings in ListingsAI web app
4. Click "Post with AI" - done!

Perfect for resellers, thrifters, and anyone selling on multiple platforms.

🤝 SUPPORT:
Questions? Visit https://listingsai.com/help or email support@listingsai.com

Start saving hours today with ListingsAI!
```

**Category:** Productivity

**Language:** English

### 5. Privacy Policy (REQUIRED)

Create a privacy policy page at `https://listingsai.com/privacy` or `https://ai-resell-agent.vercel.app/privacy`

Minimum requirements:

- What data is collected (none stored by extension)
- How data is used (local automation only)
- Third-party services (none)
- Contact information

### 6. Permissions Justification

When submitting, Chrome will ask why you need each permission:

| Permission       | Justification                                                      |
| ---------------- | ------------------------------------------------------------------ |
| `storage`        | Store user preferences and job queue locally                       |
| `tabs`           | Open marketplace tabs for automated listing creation               |
| `activeTab`      | Interact with the current tab to fill listing forms                |
| `scripting`      | Inject content scripts to automate form filling                    |
| `notifications`  | Notify users when listings are created or if errors occur          |
| Host permissions | Required to interact with Poshmark, Mercari, eBay, and our web app |

---

## 🚀 Submission Steps

### 1. Create Chrome Web Store Developer Account

✅ You've already done this!

### 2. Prepare Extension Package

```bash
cd browser-extension
# Create a ZIP file (exclude unnecessary files)
zip -r ../listingsai-extension.zip . -x "*.git*" -x "node_modules/*" -x "scripts/*" -x "*.md"
```

### 3. Upload to Chrome Web Store

1. Go to https://chrome.google.com/webstore/devconsole
2. Click "New Item"
3. Upload `listingsai-extension.zip`
4. Fill in store listing information
5. Upload screenshots and promotional images
6. Add privacy policy URL
7. Submit for review

### 4. After Approval

1. Note your Extension ID (e.g., `abcdefghijklmnop...`)
2. Add to your `.env.local`:
   ```
   NEXT_PUBLIC_EXTENSION_ID=your_extension_id_here
   ```
3. Update production environment variables

---

## 📊 Post-Launch Checklist

- [ ] Monitor Chrome Web Store reviews
- [ ] Set up error tracking (consider Sentry)
- [ ] Create support documentation
- [ ] Plan update cycle for marketplace UI changes
- [ ] Test monthly for selector changes

---

## 🔄 Update Process

When marketplaces change their UI:

1. Update selectors in content scripts:
   - [poshmark.js](content-scripts/poshmark.js)
   - [mercari.js](content-scripts/mercari.js)
   - [ebay.js](content-scripts/ebay.js)

2. Test thoroughly locally

3. Update version in manifest.json:

   ```json
   "version": "1.0.1"
   ```

4. Upload new ZIP to Chrome Web Store

5. Submit for review (usually 1-3 days)
