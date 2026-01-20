# AI Resell Agent - Chrome Extension

This Chrome extension enables automated posting of your listings to multiple marketplaces (Poshmark, Mercari, eBay, Depop) using your existing browser sessions.

## 🚀 Features

- **No Passwords Required**: Uses your existing logged-in sessions
- **Multi-Marketplace Support**: Post to Poshmark, Mercari, eBay, and Depop
- **Secure**: All operations happen in your own browser
- **Real-time Status**: See which marketplaces you're logged into
- **Job Queue**: View and manage pending listing jobs

## 📦 Installation

### Option 1: Chrome Web Store (Coming Soon)

The extension will be available on the Chrome Web Store.

### Option 2: Developer Mode (For Development)

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select this `browser-extension` folder
5. The extension icon should appear in your toolbar

## 🔧 Setup

### 1. Create Extension Icons

Before loading the extension, create icon files in the `icons/` folder:

- `icon16.png` (16x16)
- `icon32.png` (32x32)
- `icon48.png` (48x48)
- `icon128.png` (128x128)

See `icons/README.md` for instructions.

### 2. Configure Your Environment

The extension connects to `http://localhost:3000` by default. For production:

1. Edit `background.js`
2. Update `CONFIG.APP_URL` to your production URL
3. Reload the extension

## 🎯 How It Works

### 1. Connect to Marketplaces

1. Open the extension popup (click the icon)
2. Click "Log in" next to each marketplace
3. Complete the login in the new tab
4. Click "Refresh" in the extension to detect your sessions

### 2. Create Listings

1. Go to the AI Resell Agent web app
2. Create a new listing with images and details
3. Select which marketplaces to post to
4. Click "Post with AI"

### 3. Process Jobs

1. The extension will show pending jobs
2. Click "Start Posting" to begin
3. The extension opens marketplace tabs and fills in your listing
4. Review and submit each listing

## 📁 File Structure

```
browser-extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker (handles communication)
├── popup.html            # Extension popup UI
├── popup.js              # Popup functionality
├── content-scripts/      # Scripts injected into marketplace pages
│   ├── poshmark.js       # Poshmark automation
│   ├── mercari.js        # Mercari automation
│   └── ebay.js           # eBay automation
└── icons/                # Extension icons
    └── README.md         # Icon creation instructions
```

## 🔒 Security

- **No Credentials Stored**: We never ask for or store your marketplace passwords
- **Session-Based**: Uses your existing browser sessions
- **Local Processing**: All automation happens in your browser
- **Open Source**: You can review all the code

## 🐛 Troubleshooting

### Extension Not Detected

- Make sure you've loaded the extension in Chrome
- Refresh the AI Resell Agent web page
- Check that the extension is enabled in `chrome://extensions`

### Marketplace Shows "Not logged in"

- Open the marketplace in a new tab
- Log in manually
- Click "Refresh" in the extension popup

### Posting Fails

- Make sure you're still logged into the marketplace
- Check that the marketplace tab isn't blocked by a popup
- Try logging out and back in to the marketplace

## 🤝 Contributing

1. Fork the repository
2. Make your changes
3. Test thoroughly with all supported marketplaces
4. Submit a pull request

## 📄 License

MIT License - see the main project LICENSE file.
