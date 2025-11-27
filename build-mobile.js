#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🚀 Building RAVR Audio Engine for Mobile...\n");

// 1. Build the PWA
console.log("📱 Building PWA...");
try {
  execSync("pnpm build", { stdio: "inherit" });
  console.log("✅ PWA build completed\n");
} catch (error) {
  console.error("❌ PWA build failed:", error.message);
  process.exit(1);
}

// 2. Generate service worker
console.log("⚙️ Generating service worker...");
const swContent = `
// RAVR Audio Engine Service Worker
const CACHE_NAME = 'ravr-audio-engine-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/assets/css/main.css',
  '/assets/js/main.js',
  '/assets/js/vendor-react.js',
  '/assets/js/vendor-ui.js',
  '/pwa-192x192.png',
  '/pwa-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
`;

fs.writeFileSync(path.join(__dirname, "dist/sw.js"), swContent);
console.log("✅ Service worker generated\n");

// 3. Create mobile deployment instructions
const deploymentInstructions = `
# 📱 RAVR Audio Engine - Mobile Deployment

## 🌐 PWA Deployment (Web App)

### Option 1: GitHub Pages (Free)
1. Push to GitHub repository
2. Go to Settings > Pages
3. Select source branch (main/master)
4. Your app will be available at: https://username.github.io/repository-name

### Option 2: Netlify (Free tier)
1. Connect your GitHub repository to Netlify
2. Build command: \`pnpm build\`
3. Publish directory: \`dist\`
4. Your app will be available at custom URL

### Option 3: Vercel (Free tier)
1. Install Vercel CLI: \`npm i -g vercel\`
2. Run: \`vercel --prod\`
3. Follow the prompts
4. Your app will be available at custom URL

## 📲 Installing as Mobile App

### iOS (iPhone/iPad)
1. Open Safari browser
2. Navigate to your deployed PWA URL
3. Tap Share button (square with arrow up)
4. Tap "Add to Home Screen"
5. Tap "Add" to confirm

### Android
1. Open Chrome browser
2. Navigate to your deployed PWA URL
3. Tap menu (three dots) > "Add to Home screen"
4. Tap "Add" to confirm

## 🚀 Advanced: React Native (Native Apps)

For true native apps, consider these options:

### Option A: Expo (Easiest)
\`\`\`bash
# Install Expo CLI
pnpm add -g @expo/cli

# Create new Expo project
npx create-expo-app RAVRMobile --template

# Copy your React components to Expo project
# Adapt Web Audio API to Expo Audio API
\`\`\`

### Option B: React Native CLI
\`\`\`bash
# Install React Native CLI
pnpm add -g react-native-cli

# Create new project
npx react-native init RAVRMobile

# Copy and adapt components
\`\`\`

### Option C: Capacitor (Hybrid)
\`\`\`bash
# Install Capacitor
pnpm add @capacitor/core @capacitor/cli

# Initialize Capacitor
npx cap init RAVRMobile com.ravr.audio

# Add platforms
npx cap add ios
npx cap add android

# Build and sync
pnpm build
npx cap sync
npx cap open ios
npx cap open android
\`\`\`

## 📋 Mobile-Specific Features

Your RAVR app now includes:
- ✅ PWA manifest (installable)
- ✅ Service worker (offline support)
- ✅ Mobile-optimized UI components
- ✅ Touch-friendly controls
- ✅ Responsive design
- ✅ Audio file picker
- ✅ Mobile navigation drawer

## 🎯 Next Steps

1. Deploy your PWA to a hosting service
2. Test on real mobile devices
3. Submit to app stores (if using React Native/Capacitor)
4. Monitor performance and user feedback

Happy mobile audio processing! 🎵📱
`;

fs.writeFileSync(
  path.join(__dirname, "MOBILE_DEPLOYMENT.md"),
  deploymentInstructions
);
console.log("✅ Mobile deployment guide created: MOBILE_DEPLOYMENT.md\n");

console.log("🎉 Mobile build completed successfully!");
console.log("📱 Your PWA is ready for mobile deployment");
console.log("📖 Check MOBILE_DEPLOYMENT.md for deployment instructions");
console.log("\n🚀 Quick start:");
console.log("   1. Deploy dist/ folder to any web host");
console.log("   2. Users can install as mobile app from browser");
console.log("   3. For native apps, use React Native or Capacitor");
