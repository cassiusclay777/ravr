/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
const config = {
  appId: 'com.ravr.audioplayer',
  productName: 'RAVR Audio Player',
  directories: {
    output: 'dist-electron',
    buildResources: 'electron/resources',
  },
  files: [
    'dist/**/*',
    'electron/**/*',
    'preload.js',
    'package.json',
    {
      from: 'node_modules',
      filter: [
        '!**/node_modules/**/{CHANGELOG.md,README.md,README,readme.md,readme}',
        '!**/node_modules/**/{test,__tests__}/**',
        '!**/node_modules/**/*.d.ts',
        '!**/node_modules/.bin',
        '!**/node_modules/**/{tsconfig.json,tslint.json}',
        '!**/node_modules/**/{*.map,*.js.map,*.min.js.map}',
      ],
    },
  ],
  main: 'electron.js',
  asar: true,
  asarUnpack: [
    'node_modules/ffmpeg-static/**/*',
    'node_modules/@ffmpeg/**/*',
  ],
  
  // Windows configuration
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64'],
      },
      {
        target: 'portable',
        arch: ['x64'],
      },
    ],
    icon: 'assets/icon.ico',
    requestedExecutionLevel: 'asInvoker',
    artifactName: '${productName}-${version}-${arch}.${ext}',
    publisherName: 'RAVR Audio',
    verifyUpdateCodeSignature: false,
  },
  
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    allowElevation: true,
    deleteAppDataOnUninstall: false,
    createDesktopShortcut: 'always',
    createStartMenuShortcut: true,
    installerIcon: 'assets/icon.ico',
    uninstallerIcon: 'assets/icon.ico',
    installerHeaderIcon: 'assets/icon.ico',
    shortcutName: 'RAVR Audio Player',
    menuCategory: true,
    runAfterFinish: true,
    warningsAsErrors: false,
  },
  
  // macOS configuration
  mac: {
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64'],
      },
      {
        target: 'zip',
        arch: ['x64', 'arm64'],
      },
    ],
    icon: 'electron/resources/icon.icns',
    category: 'public.app-category.music',
    entitlements: 'electron/entitlements.mac.plist',
    entitlementsInherit: 'electron/entitlements.mac.plist',
    notarize: {
      teamId: process.env.APPLE_TEAM_ID,
    },
  },
  
  dmg: {
    contents: [
      {
        x: 130,
        y: 220,
      },
      {
        x: 410,
        y: 220,
        type: 'link',
        path: '/Applications',
      },
    ],
    artifactName: '${productName}-${version}-${arch}.${ext}',
  },
  
  // Linux configuration
  linux: {
    target: [
      {
        target: 'AppImage',
        arch: ['x64', 'arm64'],
      },
      {
        target: 'deb',
        arch: ['x64', 'arm64'],
      },
      {
        target: 'rpm',
        arch: ['x64', 'arm64'],
      },
    ],
    icon: 'electron/resources/icon.png',
    category: 'AudioVideo',
    synopsis: 'Advanced Audio Player with AI Enhancement',
    description: 'RAVR is a next-generation audio player featuring AI-powered enhancement, advanced DSP effects, and support for multiple audio formats.',
  },
  
  // Code signing
  beforeSign: async (context) => {
    // Custom code signing logic here if needed
    console.log('Signing:', context.appOutDir);
  },
  
  // Auto-updater configuration
  publish: {
    provider: 'github',
    owner: 'ravr-org',
    repo: 'ravr-player',
    private: false,
  },
  
  // Build optimization
  compression: 'maximum',
  
  // Security
  protocols: [
    {
      name: 'ravr-audio',
      schemes: ['ravr'],
    },
  ],
  
  // File associations
  fileAssociations: [
    {
      ext: ['mp3', 'flac', 'wav', 'm4a', 'ogg', 'aac', 'wma'],
      name: 'Audio File',
      description: 'Audio file supported by RAVR',
      icon: 'electron/resources/file-audio.ico',
    },
    {
      ext: 'euph',
      name: 'EUPH Audio File',
      description: 'Enhanced Universal Packed High-quality audio format',
      icon: 'electron/resources/file-euph.ico',
    },
  ],
};

module.exports = config;
