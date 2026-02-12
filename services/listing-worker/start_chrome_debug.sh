#!/bin/bash
# Start Chrome with remote debugging enabled for local mode testing
#
# Usage: ./start_chrome_debug.sh

PORT=9222
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# For Linux users, uncomment this:
# CHROME_PATH="/usr/bin/google-chrome"

# For Windows users in WSL, uncomment this:
# CHROME_PATH="/mnt/c/Program Files/Google/Chrome/Application/chrome.exe"

echo "🚀 Starting Chrome with remote debugging on port $PORT..."
echo ""
echo "📝 Instructions:"
echo "   1. Chrome will open in a new window"
echo "   2. Log into Poshmark, eBay, or Mercari"
echo "   3. Run: python test_local_mode.py --marketplace poshmark --dry-run"
echo ""

# Check if Chrome is already running with debugging
if lsof -i :$PORT > /dev/null 2>&1; then
    echo "⚠️  Port $PORT is already in use!"
    echo "   Chrome may already be running with debugging enabled."
    echo "   Or run: lsof -i :$PORT to see what's using it."
    exit 1
fi

# Start Chrome
"$CHROME_PATH" \
    --remote-debugging-port=$PORT \
    --user-data-dir="/tmp/chrome-debug-profile" \
    --no-first-run \
    --no-default-browser-check \
    &

echo ""
echo "✅ Chrome started! Use Ctrl+C to stop this script (Chrome will keep running)"
echo ""
echo "🔗 DevTools URL: http://localhost:$PORT"

# Keep script running to show Chrome output
wait
