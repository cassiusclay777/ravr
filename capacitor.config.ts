import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ravr.audioplayer",
  appName: "RAVR Audio Engine",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0a0a0a",
      showSpinner: false,
    },
    StatusBar: {
      style: "dark",
    },
    Audio: {
      // Enable audio recording and playback
      audioMode: "playback",
    },
    Filesystem: {
      // Enable file system access for audio files
      iosIsDocumentPickerEnabled: true,
      androidIsDocumentPickerEnabled: true,
    },
    AndroidWidget: {
      // Android Widget Plugin - automatically registered
      // No configuration needed
    },
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },
};

export default config;
