# ListingsAI - Chrome Extension

Automatically post your listings to Poshmark, Mercari, and eBay from the ListingsAI web app. Uses your existing browser sessions - no passwords required!

## 🚀 Features

- **One-Click Cross-Posting**: Create once, post everywhere
- **No Passwords Required**: Uses your existing logged-in browser sessions
- **AI-Powered Optimization**: Titles and descriptions optimized per marketplace
- **Real-time Status**: See which marketplaces you're logged into
- **Job Queue**: Manage pending listings with progress tracking
- **Secure**: All automation happens locally in your browser

## 📦 Installation

### From Chrome Web Store (Recommended)

1. Visit the [ListingsAI Extension](https://chrome.google.com/webstore/detail/listingsai) on Chrome Web Store
2. Click "Add to Chrome"
3. Confirm the installation

### Developer Mode (For Development)

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (toggle in top right)
4. Click **Load unpacked**
5. Select the `browser-extension` folder
6. The extension icon should appear in your toolbar

## 🎯 How It Works

### 1. Connect to Marketplaces

1. Click the extension icon in your toolbar
2. Click "Login" next to each marketplace you want to use
3. Complete the login in the new tab
4. Click "Refresh" to detect your sessions

### 2. Create & Post Listings

1. Go to [ListingsAI](https://ai-resell-agent.vercel.app) (or your deployed URL)
2. Create a new listing with images and details
3. Select which marketplaces to post to
4. Click "Post with AI"
5. The extension automatically opens tabs and fills in your listing!

### 3. Monitor Progress

- The extension popup shows pending jobs
- Click "Start Posting" to process queued listings
- Receive notifications when listings are created

## 📁 Project Structure

```
browser-extension/
├── manifest.json              # Extension configuration (MV3)
├── background.js              # Service worker (job queue, messaging)
├── popup.html                 # Extension popup UI
├── popup.js                   # Popup functionality
├── content.js                 # General content script
├── content-scripts/
│   ├── webapp.js              # Bridge to ListingsAI web app
│   ├── poshmark.js            # Poshmark form automation
│   ├── mercari.js             # Mercari form automation
│   └── ebay.js                # eBay form automation
├── icons/                     # Extension icons (16, 32, 48, 128px)
├── scripts/
│   └── generate-icons.js      # Icon generation script
├── CHROME_STORE_SUBMISSION.md # Store submission guide
└── README.md                  # This file
```

## 🔧 Development

### Generate Icons

```bash
cd browser-extension
npm install canvas
node scripts/generate-icons.js
```

### Test Locally

1. Load extension in developer mode
2. Open ListingsAI web app
3. Create a test listing
4. Verify extension communication works
5. Test posting to each marketplace

### Update Selectors

Marketplace UIs change frequently. Update selectors in:

- `content-scripts/poshmark.js`
- `content-scripts/mercari.js`
- `content-scripts/ebay.js`

## 🔒 Security & Privacy

| What We DO                                  | What We DON'T                         |
| ------------------------------------------- | ------------------------------------- |
| ✅ Use your existing browser sessions       | ❌ Store your marketplace passwords   |
| ✅ Process listings locally in your browser | ❌ Send your data to external servers |
| ✅ Store job queue in Chrome local storage  | ❌ Track your browsing activity       |
| ✅ Open source and auditable                | ❌ Sell your data to third parties    |

See our [Privacy Policy](https://ai-resell-agent.vercel.app/privacy) for details.

## 🐛 Troubleshooting

### Extension Not Detected by Web App

- Ensure extension is installed and enabled
- Refresh the web app page
- Check Console for error messages
- Verify `NEXT_PUBLIC_EXTENSION_ID` in environment

### "Not Logged In" Status

- Open the marketplace in a new tab
- Log in manually (stay logged in)
- Click "Refresh" in extension popup

### Posting Fails

- Verify you're still logged into the marketplace
- Check if marketplace UI has changed (selector updates needed)
- Look at Console logs for specific errors
- Try manual refresh and re-attempt

## 📊 Supported Marketplaces

| Marketplace | Status          | Notes                                            |
| ----------- | --------------- | ------------------------------------------------ |
| Poshmark    | ✅ Full Support | Images, titles, descriptions, size, brand, price |
| Mercari     | ✅ Full Support | Images, titles, descriptions, condition, price   |
| eBay        | ✅ Full Support | Images, titles, descriptions, condition, price   |
| Depop       | 🚧 Coming Soon  | In development                                   |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with all supported marketplaces
5. Submit a pull request

## 📄 License

MIT License - see the main project LICENSE file.

## 📞 Support

- 📧 Email: support@listingsai.com
- 🌐 Help Center: https://listingsai.com/help
- 🐛 Issues: [GitHub Issues](https://github.com/john-nxt1sports/Ai-resell-agent/issues)
