# Extension Icons

To complete the extension setup, you need to create icon files:

## Required Files

- `icon16.png` (16x16 pixels)
- `icon32.png` (32x32 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

## Quick Option: Use Placeholder Icons

Run this script in terminal to create simple placeholder icons (requires ImageMagick):

```bash
cd browser-extension/icons
# Create a simple gradient icon
convert -size 128x128 gradient:purple-blue -fill white -gravity center -pointsize 48 -annotate 0 "AI" icon128.png
convert icon128.png -resize 48x48 icon48.png
convert icon128.png -resize 32x32 icon32.png
convert icon128.png -resize 16x16 icon16.png
```

## Or use any 🤖 robot emoji as a base image

## Design Suggestions

- Use the same purple/blue gradient as the app (#6366f1 to #8b5cf6)
- Include a simple "AI" text or robot icon
- Keep it clean and recognizable at small sizes
