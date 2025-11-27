#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🚀 RAVR Mobile Deployment Helper\n");

// Check if dist folder exists
if (!fs.existsSync("dist")) {
  console.log("📱 Building mobile version first...");
  execSync("pnpm build:mobile", { stdio: "inherit" });
}

console.log("🌐 Choose deployment option:\n");
console.log("1. 📁 GitHub Pages (Free, automatic)");
console.log("2. ☁️  Netlify (Free, drag & drop)");
console.log("3. ⚡ Vercel (Free, CLI)");
console.log("4. 🔧 Custom server (Manual)");
console.log("5. 📱 Capacitor (Native apps)\n");

const readline = require("readline");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Enter your choice (1-5): ", (choice) => {
  switch (choice.trim()) {
    case "1":
      deployGitHubPages();
      break;
    case "2":
      deployNetlify();
      break;
    case "3":
      deployVercel();
      break;
    case "4":
      deployCustom();
      break;
    case "5":
      deployCapacitor();
      break;
    default:
      console.log("❌ Invalid choice. Please run the script again.");
  }
  rl.close();
});

function deployGitHubPages() {
  console.log("\n📁 GitHub Pages Deployment:");
  console.log("1. Push your code to GitHub:");
  console.log("   git add .");
  console.log('   git commit -m "Mobile PWA ready"');
  console.log("   git push origin main");
  console.log("\n2. Enable GitHub Pages:");
  console.log("   - Go to your GitHub repository");
  console.log("   - Click Settings > Pages");
  console.log("   - Source: Deploy from a branch");
  console.log("   - Branch: main");
  console.log("   - Folder: / (root)");
  console.log("   - Click Save");
  console.log("\n3. Your app will be available at:");
  console.log("   https://username.github.io/repository-name");
  console.log("\n4. Test on mobile:");
  console.log("   - Open the URL in mobile browser");
  console.log('   - Tap "Add to Home Screen"');
}

function deployNetlify() {
  console.log("\n☁️ Netlify Deployment:");
  console.log("Option A - Drag & Drop (Easiest):");
  console.log("1. Go to netlify.com");
  console.log('2. Drag the "dist" folder to the deploy area');
  console.log("3. Your app will be deployed instantly!");
  console.log("\nOption B - GitHub Integration:");
  console.log("1. Connect your GitHub repository to Netlify");
  console.log("2. Build command: pnpm build:mobile");
  console.log("3. Publish directory: dist");
  console.log("4. Deploy!");
}

function deployVercel() {
  console.log("\n⚡ Vercel Deployment:");
  console.log("1. Install Vercel CLI:");
  console.log("   pnpm add -g vercel");
  console.log("\n2. Deploy:");
  console.log("   vercel --prod");
  console.log("\n3. Follow the prompts");
  console.log("4. Your app will be live in seconds!");
}

function deployCustom() {
  console.log("\n🔧 Custom Server Deployment:");
  console.log('1. Upload the "dist" folder to your web server');
  console.log("2. Ensure HTTPS is enabled (required for PWA)");
  console.log("3. Configure server to serve index.html for all routes");
  console.log("4. Test the manifest.webmanifest file is accessible");
  console.log("\nServer configuration examples:");
  console.log("- Apache: .htaccess with RewriteRule");
  console.log("- Nginx: try_files directive");
  console.log('- Express: app.use(express.static("dist"))');
}

function deployCapacitor() {
  console.log("\n📱 Capacitor Native App Deployment:");
  console.log("1. Install Capacitor:");
  console.log("   pnpm add @capacitor/core @capacitor/cli");
  console.log("   pnpm add @capacitor/ios @capacitor/android");
  console.log("\n2. Initialize Capacitor:");
  console.log('   npx cap init "RAVR Audio Engine" "com.ravr.audioplayer"');
  console.log("\n3. Build and sync:");
  console.log("   pnpm run build:mobile");
  console.log("   npx cap add ios");
  console.log("   npx cap add android");
  console.log("   npx cap sync");
  console.log("\n4. Open in IDEs:");
  console.log("   npx cap open ios    # Opens Xcode");
  console.log("   npx cap open android # Opens Android Studio");
  console.log("\n5. Build and submit to app stores");
}
