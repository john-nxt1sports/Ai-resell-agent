/**
 * Generate extension icons
 * Run: node browser-extension/scripts/generate-icons.js
 *
 * Requires: npm install canvas (or run without for SVG fallback)
 */

const fs = require("fs");
const path = require("path");

// Create SVG icon as a fallback (can be converted to PNG)
function createSvgIcon(size) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="100%" style="stop-color:#8b5cf6"/>
    </linearGradient>
    <linearGradient id="shine" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(255,255,255,0.3)"/>
      <stop offset="50%" style="stop-color:rgba(255,255,255,0)"/>
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="128" height="128" rx="24" fill="url(#bg)"/>
  
  <!-- Shine overlay -->
  <rect width="128" height="64" rx="24" fill="url(#shine)"/>
  
  <!-- AI Text -->
  <text x="64" y="82" font-family="Arial, sans-serif" font-size="56" font-weight="bold" fill="white" text-anchor="middle">AI</text>
  
  <!-- Small checkmark/sync indicator -->
  <circle cx="100" cy="100" r="18" fill="#22c55e"/>
  <path d="M92 100 L98 106 L110 94" stroke="white" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, "..", "icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG files for each size
const sizes = [16, 32, 48, 128];

sizes.forEach((size) => {
  const svg = createSvgIcon(size);
  const svgPath = path.join(iconsDir, `icon${size}.svg`);
  fs.writeFileSync(svgPath, svg);
  console.log(`Created ${svgPath}`);
});

console.log("\n✅ SVG icons created!");
console.log("\n📝 To convert to PNG, you can:");
console.log("1. Use an online converter like https://svgtopng.com/");
console.log("2. Use ImageMagick: convert icon128.svg icon128.png");
console.log("3. Use Inkscape: inkscape icon128.svg -o icon128.png");
console.log("\nAlternatively, use the canvas version below:\n");

// Try to use canvas if available
try {
  const { createCanvas } = require("canvas");

  sizes.forEach((size) => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");
    const scale = size / 128;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, "#6366f1");
    gradient.addColorStop(1, "#8b5cf6");

    // Rounded rectangle
    const radius = 24 * scale;
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(size - radius, 0);
    ctx.quadraticCurveTo(size, 0, size, radius);
    ctx.lineTo(size, size - radius);
    ctx.quadraticCurveTo(size, size, size - radius, size);
    ctx.lineTo(radius, size);
    ctx.quadraticCurveTo(0, size, 0, size - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // AI text
    ctx.fillStyle = "white";
    ctx.font = `bold ${56 * scale}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("AI", size / 2, size / 2);

    // Green checkmark circle (only if large enough)
    if (size >= 48) {
      const circleX = 100 * scale;
      const circleY = 100 * scale;
      const circleR = 18 * scale;

      ctx.beginPath();
      ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2);
      ctx.fillStyle = "#22c55e";
      ctx.fill();

      // Checkmark
      ctx.beginPath();
      ctx.moveTo(92 * scale, 100 * scale);
      ctx.lineTo(98 * scale, 106 * scale);
      ctx.lineTo(110 * scale, 94 * scale);
      ctx.strokeStyle = "white";
      ctx.lineWidth = 4 * scale;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }

    // Save PNG
    const buffer = canvas.toBuffer("image/png");
    const pngPath = path.join(iconsDir, `icon${size}.png`);
    fs.writeFileSync(pngPath, buffer);
    console.log(`Created PNG: ${pngPath}`);
  });

  console.log("\n✅ PNG icons created successfully!");
} catch (e) {
  console.log("Canvas not available. Install with: npm install canvas");
  console.log("Or convert the SVG files manually.\n");
}
