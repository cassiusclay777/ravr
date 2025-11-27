# 🔨 Android Build Instructions

## Rychlé Build

```bash
# 1. Nainstaluj dependencies (pokud ještě nebylo)
npm install

# 2. Build web assets pro Android
npm run build:mobile

# 3. Sync s Android projektem
npx cap sync android

# 4. Otevři v Android Studio
npx cap open android
```

## V Android Studio

1. Počkej na Gradle sync (automaticky)
2. Vyberte zařízení (emulator nebo telefon)
3. Klikni na **Run** (zelený trojúhelník) nebo **Shift+F10**
4. Aplikace se nainstaluje a spustí

## Debug Build

```bash
cd android
./gradlew assembleDebug
```

APK najdeš v: `android/app/build/outputs/apk/debug/app-debug.apk`

## Release Build

```bash
cd android
./gradlew assembleRelease
```

APK najdeš v: `android/app/build/outputs/apk/release/app-release.apk`

## Podepsaný Release Build (pro Google Play)

1. Vytvoř keystore:
```bash
keytool -genkey -v -keystore ravr-release-key.keystore -alias ravr -keyalg RSA -keysize 2048 -validity 10000
```

2. Přidej do `android/gradle.properties`:
```
RAVR_RELEASE_STORE_FILE=../ravr-release-key.keystore
RAVR_RELEASE_KEY_ALIAS=ravr
RAVR_RELEASE_STORE_PASSWORD=your_password
RAVR_RELEASE_KEY_PASSWORD=your_password
```

3. Přidej do `android/app/build.gradle`:
```gradle
android {
    signingConfigs {
        release {
            storeFile file(RAVR_RELEASE_STORE_FILE)
            storePassword RAVR_RELEASE_STORE_PASSWORD
            keyAlias RAVR_RELEASE_KEY_ALIAS
            keyPassword RAVR_RELEASE_KEY_PASSWORD
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

4. Build:
```bash
cd android
./gradlew bundleRelease
```

## Troubleshooting

### Gradle Sync Failed
```bash
# Clean project
cd android
./gradlew clean

# Sync again
npx cap sync android
```

### Build Failed
```bash
# Update Gradle wrapper
cd android
./gradlew wrapper --gradle-version 8.0

# Rebuild
./gradlew build
```

### Plugin Not Found
```bash
# Re-sync Capacitor
npx cap sync

# Nebo force update
npx cap sync android --force
```

### Widget Not Showing
- Zkontroluj, že `AudioWidget.java` je v správném package
- Rebuild projekt: Build → Rebuild Project
- Uninstall aplikaci a nainstaluj znovu

## Performance Optimization

Pro produkční build:

1. **Enable Proguard:**
```gradle
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

2. **Optimize Images:**
- Použij WebP formát pro obrázky
- Compress assets

3. **Enable R8:**
```gradle
android {
    buildFeatures {
        buildConfig = true
    }
}
```

## Testing

```bash
# Run unit tests
cd android
./gradlew test

# Run instrumented tests
./gradlew connectedAndroidTest
```

## Logcat

Pro debugging:
```bash
adb logcat | grep RAVR
```

Nebo v Android Studio: View → Tool Windows → Logcat

---

**Ready to build! 🚀**
