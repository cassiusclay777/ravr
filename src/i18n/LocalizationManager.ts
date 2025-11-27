interface Translation {
  [key: string]: string | Translation;
}

interface LocaleConfig {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  rtl: boolean;
  translations: Translation;
}

type LocaleCode = 'en' | 'cs' | 'de' | 'fr' | 'es' | 'it' | 'ru' | 'ja' | 'ko' | 'zh';

export class LocalizationManager {
  private currentLocale: LocaleCode = 'en';
  private locales: Map<LocaleCode, LocaleConfig> = new Map();
  private fallbackLocale: LocaleCode = 'en';
  private missingKeys: Set<string> = new Set();

  constructor() {
    this.initializeLocales();
    this.detectSystemLocale();
  }

  private initializeLocales(): void {
    // English (default)
    this.locales.set('en', {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      flag: '🇺🇸',
      rtl: false,
      translations: {
        common: {
          ok: 'OK',
          cancel: 'Cancel',
          save: 'Save',
          load: 'Load',
          delete: 'Delete',
          settings: 'Settings',
          help: 'Help'
        },
        audio: {
          play: 'Play',
          pause: 'Pause',
          stop: 'Stop',
          volume: 'Volume',
          mute: 'Mute',
          loop: 'Loop'
        },
        dsp: {
          equalizer: 'Equalizer',
          compressor: 'Compressor',
          reverb: 'Reverb',
          gain: 'Gain',
          frequency: 'Frequency'
        }
      }
    });

    // Czech
    this.locales.set('cs', {
      code: 'cs',
      name: 'Czech',
      nativeName: 'Čeština',
      flag: '🇨🇿',
      rtl: false,
      translations: {
        common: {
          ok: 'OK',
          cancel: 'Zrušit',
          save: 'Uložit',
          load: 'Načíst',
          delete: 'Smazat',
          settings: 'Nastavení',
          help: 'Nápověda'
        },
        audio: {
          play: 'Přehrát',
          pause: 'Pozastavit',
          stop: 'Zastavit',
          volume: 'Hlasitost',
          mute: 'Ztlumit',
          loop: 'Smyčka'
        },
        dsp: {
          equalizer: 'Ekvalizér',
          compressor: 'Kompresor',
          reverb: 'Dozvuk',
          gain: 'Zesílení',
          frequency: 'Frekvence'
        }
      }
    });

    // German
    this.locales.set('de', {
      code: 'de',
      name: 'German',
      nativeName: 'Deutsch',
      flag: '🇩🇪',
      rtl: false,
      translations: {
        common: {
          ok: 'OK',
          cancel: 'Abbrechen',
          save: 'Speichern',
          load: 'Laden',
          delete: 'Löschen',
          settings: 'Einstellungen',
          help: 'Hilfe'
        },
        audio: {
          play: 'Wiedergeben',
          pause: 'Pausieren',
          stop: 'Stoppen',
          volume: 'Lautstärke',
          mute: 'Stummschalten',
          loop: 'Schleife'
        },
        dsp: {
          equalizer: 'Equalizer',
          compressor: 'Kompressor',
          reverb: 'Hall',
          gain: 'Verstärkung',
          frequency: 'Frequenz'
        }
      }
    });

    // More locales...
  }

  private detectSystemLocale(): void {
    const systemLocale = navigator.language.split('-')[0] as LocaleCode;
    if (this.locales.has(systemLocale)) {
      this.currentLocale = systemLocale;
    }
    
    const saved = localStorage.getItem('ravr-locale');
    if (saved && this.locales.has(saved as LocaleCode)) {
      this.currentLocale = saved as LocaleCode;
    }
  }

  setLocale(locale: LocaleCode): void {
    if (this.locales.has(locale)) {
      this.currentLocale = locale;
      localStorage.setItem('ravr-locale', locale);
      document.documentElement.lang = locale;
      
      // Update RTL
      const config = this.locales.get(locale)!;
      document.documentElement.dir = config.rtl ? 'rtl' : 'ltr';
    }
  }

  t(key: string, params?: Record<string, string>): string {
    const translation = this.getNestedTranslation(key, this.currentLocale) ||
                       this.getNestedTranslation(key, this.fallbackLocale) ||
                       key;

    if (!this.getNestedTranslation(key, this.currentLocale)) {
      this.missingKeys.add(key);
    }

    return this.interpolate(translation, params);
  }

  private getNestedTranslation(key: string, locale: LocaleCode): string | null {
    const config = this.locales.get(locale);
    if (!config) return null;

    const keys = key.split('.');
    let current: any = config.translations;

    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return null;
      }
    }

    return typeof current === 'string' ? current : null;
  }

  private interpolate(text: string, params?: Record<string, string>): string {
    if (!params) return text;

    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return params[key] || match;
    });
  }

  getCurrentLocale(): LocaleCode {
    return this.currentLocale;
  }

  getAvailableLocales(): LocaleConfig[] {
    return Array.from(this.locales.values());
  }

  getMissingKeys(): string[] {
    return Array.from(this.missingKeys);
  }
}

export const i18n = new LocalizationManager();
