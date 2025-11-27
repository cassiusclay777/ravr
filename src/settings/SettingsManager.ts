import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface AudioSettings {
  outputDevice: string;
  sampleRate: number;
  bufferSize: number;
  latency: 'low' | 'balanced' | 'high';
  enableExclusiveMode: boolean;
  enableReplayGain: boolean;
  replayGainMode: 'track' | 'album';
  crossfadeDuration: number;
  enableGaplessPlayback: boolean;
}

export interface DSPSettings {
  enableAI: boolean;
  aiEnhancementLevel: number;
  enableRelativisticEffects: boolean;
  enableHRTF: boolean;
  hrtfProfile: string;
  enableCrossfeed: boolean;
  crossfeedStrength: number;
  enablePsychoBass: boolean;
  psychoBassFrequency: number;
  psychoBassGain: number;
}

export interface UISettings {
  theme: 'light' | 'dark' | 'auto';
  accentColor: string;
  fontSize: 'small' | 'medium' | 'large';
  enableAnimations: boolean;
  enableParticles: boolean;
  spectrumStyle: 'bars' | 'line' | 'filled';
  spectrumSensitivity: number;
  showWaveform: boolean;
  compactMode: boolean;
}

export interface KeyboardShortcuts {
  playPause: string;
  nextTrack: string;
  previousTrack: string;
  volumeUp: string;
  volumeDown: string;
  mute: string;
  toggleShuffle: string;
  toggleRepeat: string;
  showEqualizer: string;
  showLibrary: string;
  showSettings: string;
  focusSearch: string;
  toggleFullscreen: string;
  exportCurrent: string;
  importFiles: string;
}

export interface LibrarySettings {
  scanFolders: string[];
  watchFolders: boolean;
  supportedFormats: string[];
  enableAutomaticTagging: boolean;
  enableCoverArtFetch: boolean;
  enableLyricsSync: boolean;
  libraryViewMode: 'list' | 'grid' | 'cards';
  sortBy: 'title' | 'artist' | 'album' | 'dateAdded' | 'duration';
  sortOrder: 'asc' | 'desc';
}

export interface AdvancedSettings {
  enableDebugMode: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  enableTelemetry: boolean;
  enableCrashReporting: boolean;
  maxCacheSize: number;
  enablePreloading: boolean;
  preloadCount: number;
  enableSystemTrayIntegration: boolean;
  enableDiscordRichPresence: boolean;
  enableLastFmScrobbling: boolean;
  lastFmUsername?: string;
  enableSpotifyIntegration: boolean;
}

export interface RavrSettings {
  audio: AudioSettings;
  dsp: DSPSettings;
  ui: UISettings;
  keyboard: KeyboardShortcuts;
  library: LibrarySettings;
  advanced: AdvancedSettings;
  version: string;
  lastUpdated: string;
}

const defaultSettings: RavrSettings = {
  audio: {
    outputDevice: 'default',
    sampleRate: 44100,
    bufferSize: 512,
    latency: 'balanced',
    enableExclusiveMode: false,
    enableReplayGain: true,
    replayGainMode: 'track',
    crossfadeDuration: 3000,
    enableGaplessPlayback: true,
  },
  dsp: {
    enableAI: true,
    aiEnhancementLevel: 0.5,
    enableRelativisticEffects: false,
    enableHRTF: false,
    hrtfProfile: 'default',
    enableCrossfeed: false,
    crossfeedStrength: 0.3,
    enablePsychoBass: false,
    psychoBassFrequency: 80,
    psychoBassGain: 0.2,
  },
  ui: {
    theme: 'auto',
    accentColor: '#6366f1',
    fontSize: 'medium',
    enableAnimations: true,
    enableParticles: true,
    spectrumStyle: 'bars',
    spectrumSensitivity: 0.7,
    showWaveform: true,
    compactMode: false,
  },
  keyboard: {
    playPause: 'Space',
    nextTrack: 'ArrowRight',
    previousTrack: 'ArrowLeft',
    volumeUp: 'ArrowUp',
    volumeDown: 'ArrowDown',
    mute: 'M',
    toggleShuffle: 'S',
    toggleRepeat: 'R',
    showEqualizer: 'E',
    showLibrary: 'L',
    showSettings: 'Comma',
    focusSearch: 'Ctrl+F',
    toggleFullscreen: 'F11',
    exportCurrent: 'Ctrl+E',
    importFiles: 'Ctrl+O',
  },
  library: {
    scanFolders: [],
    watchFolders: true,
    supportedFormats: ['mp3', 'flac', 'wav', 'm4a', 'ogg', 'euph'],
    enableAutomaticTagging: true,
    enableCoverArtFetch: true,
    enableLyricsSync: false,
    libraryViewMode: 'list',
    sortBy: 'title',
    sortOrder: 'asc',
  },
  advanced: {
    enableDebugMode: false,
    logLevel: 'info',
    enableTelemetry: false,
    enableCrashReporting: true,
    maxCacheSize: 512, // MB
    enablePreloading: true,
    preloadCount: 3,
    enableSystemTrayIntegration: true,
    enableDiscordRichPresence: false,
    enableLastFmScrobbling: false,
    enableSpotifyIntegration: false,
  },
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),
};

interface SettingsStore extends RavrSettings {
  updateSettings: (updates: Partial<RavrSettings>) => void;
  updateAudioSettings: (updates: Partial<AudioSettings>) => void;
  updateDSPSettings: (updates: Partial<DSPSettings>) => void;
  updateUISettings: (updates: Partial<UISettings>) => void;
  updateKeyboardShortcuts: (updates: Partial<KeyboardShortcuts>) => void;
  updateLibrarySettings: (updates: Partial<LibrarySettings>) => void;
  updateAdvancedSettings: (updates: Partial<AdvancedSettings>) => void;
  resetSettings: () => void;
  exportSettings: () => string;
  importSettings: (settingsJson: string) => void;
  validateSettings: (settings: Partial<RavrSettings>) => boolean;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...defaultSettings,

      updateSettings: (updates: Partial<RavrSettings>) =>
        set((state) => ({
          ...state,
          ...updates,
          lastUpdated: new Date().toISOString(),
        })),

      updateAudioSettings: (updates: Partial<AudioSettings>) =>
        set((state) => ({
          ...state,
          audio: { ...state.audio, ...updates },
          lastUpdated: new Date().toISOString(),
        })),

      updateDSPSettings: (updates: Partial<DSPSettings>) =>
        set((state) => ({
          ...state,
          dsp: { ...state.dsp, ...updates },
          lastUpdated: new Date().toISOString(),
        })),

      updateUISettings: (updates: Partial<UISettings>) =>
        set((state) => ({
          ...state,
          ui: { ...state.ui, ...updates },
          lastUpdated: new Date().toISOString(),
        })),

      updateKeyboardShortcuts: (updates: Partial<KeyboardShortcuts>) =>
        set((state) => ({
          ...state,
          keyboard: { ...state.keyboard, ...updates },
          lastUpdated: new Date().toISOString(),
        })),

      updateLibrarySettings: (updates: Partial<LibrarySettings>) =>
        set((state) => ({
          ...state,
          library: { ...state.library, ...updates },
          lastUpdated: new Date().toISOString(),
        })),

      updateAdvancedSettings: (updates: Partial<AdvancedSettings>) =>
        set((state) => ({
          ...state,
          advanced: { ...state.advanced, ...updates },
          lastUpdated: new Date().toISOString(),
        })),

      resetSettings: () =>
        set((state) => ({
          ...state,
          ...defaultSettings,
          lastUpdated: new Date().toISOString(),
        })),

      exportSettings: () => {
        const state = get();
        // Extract only the settings data, excluding functions
        const settings: RavrSettings = {
          audio: state.audio,
          dsp: state.dsp,
          ui: state.ui,
          keyboard: state.keyboard,
          library: state.library,
          advanced: state.advanced,
          version: state.version,
          lastUpdated: state.lastUpdated,
        };
        return JSON.stringify(settings, null, 2);
      },

      importSettings: (settingsJson: string) => {
        try {
          const importedSettings = JSON.parse(settingsJson) as RavrSettings;
          if (get().validateSettings(importedSettings)) {
            set((state) => ({
              ...state,
              ...importedSettings,
              lastUpdated: new Date().toISOString(),
            }));
          } else {
            throw new Error('Invalid settings format');
          }
        } catch (error) {
          console.error('Failed to import settings:', error);
          throw error;
        }
      },

      validateSettings: (settings: Partial<RavrSettings>): boolean => {
        // Basic validation - in real implementation, use a schema validator like Zod
        return (
          !!settings &&
          typeof settings === 'object' &&
          !!settings.audio &&
          !!settings.dsp &&
          !!settings.ui &&
          !!settings.keyboard &&
          !!settings.library &&
          !!settings.advanced
        );
      },
    }),
    {
      name: 'ravr-settings',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: (persistedState: unknown, version: number): RavrSettings => {
        // Handle settings migration between versions
        if (version === 0) {
          // Migrate from version 0 to 1
          return {
            ...defaultSettings,
            ...(persistedState as Partial<RavrSettings>),
            version: '1.0.0',
          };
        }
        return persistedState as RavrSettings;
      },
    },
  ),
);

export class SettingsManagerImpl {
  private readonly keyboardManager: KeyboardManager;
  private readonly audioDeviceManager: AudioDeviceManager;
  private readonly themeManager: ThemeManager;
  private readonly initializationPromise: Promise<void>;

  constructor() {
    this.keyboardManager = new KeyboardManager();
    this.audioDeviceManager = new AudioDeviceManager();
    this.themeManager = new ThemeManager();
    this.initializationPromise = this.initialize();
  }

  async waitForInitialization(): Promise<void> {
    await this.initializationPromise;
  }

  private async initialize(): Promise<void> {
    const state = useSettingsStore.getState();

    // Apply initial settings
    await this.applyAudioSettings(state.audio);
    this.applyUISettings(state.ui);
    this.applyKeyboardShortcuts(state.keyboard);

    // Set up watchers
    this.setupSettingsWatchers();
  }

  private setupSettingsWatchers(): void {
    useSettingsStore.subscribe(
      (state) => state.audio,
      (audioSettings) => this.applyAudioSettings(audioSettings),
    );

    useSettingsStore.subscribe(
      (state) => state.ui,
      (uiSettings) => this.applyUISettings(uiSettings),
    );

    useSettingsStore.subscribe(
      (state) => state.keyboard,
      (keyboardSettings) => this.applyKeyboardShortcuts(keyboardSettings),
    );
  }

  private async applyAudioSettings(settings: AudioSettings): Promise<void> {
    try {
      await this.audioDeviceManager.setOutputDevice(settings.outputDevice);
      await this.audioDeviceManager.setSampleRate(settings.sampleRate);
      await this.audioDeviceManager.setBufferSize(settings.bufferSize);
      await this.audioDeviceManager.setLatencyMode(settings.latency);
    } catch (error) {
      console.error('Failed to apply audio settings:', error);
    }
  }

  private applyUISettings(settings: UISettings): void {
    this.themeManager.setTheme(settings.theme);
    this.themeManager.setAccentColor(settings.accentColor);
    this.themeManager.setFontSize(settings.fontSize);
    this.themeManager.setAnimationsEnabled(settings.enableAnimations);

    // Apply CSS custom properties
    document.documentElement.style.setProperty('--accent-color', settings.accentColor);
    document.documentElement.setAttribute('data-theme', settings.theme);
    document.documentElement.setAttribute('data-animations', settings.enableAnimations.toString());
  }

  private applyKeyboardShortcuts(shortcuts: KeyboardShortcuts): void {
    this.keyboardManager.updateShortcuts(shortcuts);
  }

  async getAvailableAudioDevices(): Promise<{ id: string; label: string }[]> {
    return this.audioDeviceManager.getAvailableDevices();
  }

  async validateAudioDevice(deviceId: string): Promise<boolean> {
    return this.audioDeviceManager.validateDevice(deviceId);
  }

  exportSettingsFile(): void {
    const { exportSettings } = useSettingsStore.getState();
    const settingsJson = exportSettings();
    const blob = new Blob([settingsJson], { type: 'application/json' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ravr-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async importSettingsFile(file: File): Promise<void> {
    const text = await file.text();
    const { importSettings } = useSettingsStore.getState();
    importSettings(text);
  }
}

class KeyboardManager {
  private readonly shortcuts: Map<string, () => void> = new Map();
  private readonly pressedKeys: Set<string> = new Set();

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  private handleKeyDown(event: KeyboardEvent): void {
    // Ignore if typing in input fields
    if (this.isInputElement(event.target as Element)) {
      return;
    }

    const key = this.getKeyString(event);
    this.pressedKeys.add(key);

    const shortcut = this.shortcuts.get(key);
    if (shortcut) {
      event.preventDefault();
      shortcut();
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    const key = this.getKeyString(event);
    this.pressedKeys.delete(key);
  }

  private getKeyString(event: KeyboardEvent): string {
    const parts: string[] = [];

    if (event.ctrlKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    if (event.metaKey) parts.push('Meta');

    parts.push(event.code);

    return parts.join('+');
  }

  private isInputElement(element: Element): boolean {
    const tagName = element.tagName.toLowerCase();
    return (
      ['input', 'textarea', 'select'].includes(tagName) ||
      element.getAttribute('contenteditable') === 'true'
    );
  }

  updateShortcuts(shortcuts: KeyboardShortcuts): void {
    this.shortcuts.clear();

    // Map shortcuts to actions
    this.shortcuts.set(shortcuts.playPause, () => this.dispatchAction('PLAY_PAUSE'));
    this.shortcuts.set(shortcuts.nextTrack, () => this.dispatchAction('NEXT_TRACK'));
    this.shortcuts.set(shortcuts.previousTrack, () => this.dispatchAction('PREVIOUS_TRACK'));
    this.shortcuts.set(shortcuts.volumeUp, () => this.dispatchAction('VOLUME_UP'));
    this.shortcuts.set(shortcuts.volumeDown, () => this.dispatchAction('VOLUME_DOWN'));
    this.shortcuts.set(shortcuts.mute, () => this.dispatchAction('MUTE'));
    this.shortcuts.set(shortcuts.toggleShuffle, () => this.dispatchAction('TOGGLE_SHUFFLE'));
    this.shortcuts.set(shortcuts.toggleRepeat, () => this.dispatchAction('TOGGLE_REPEAT'));
    this.shortcuts.set(shortcuts.showEqualizer, () => this.dispatchAction('SHOW_EQUALIZER'));
    this.shortcuts.set(shortcuts.showLibrary, () => this.dispatchAction('SHOW_LIBRARY'));
    this.shortcuts.set(shortcuts.showSettings, () => this.dispatchAction('SHOW_SETTINGS'));
    this.shortcuts.set(shortcuts.focusSearch, () => this.dispatchAction('FOCUS_SEARCH'));
    this.shortcuts.set(shortcuts.toggleFullscreen, () => this.dispatchAction('TOGGLE_FULLSCREEN'));
    this.shortcuts.set(shortcuts.exportCurrent, () => this.dispatchAction('EXPORT_CURRENT'));
    this.shortcuts.set(shortcuts.importFiles, () => this.dispatchAction('IMPORT_FILES'));
  }

  private dispatchAction(action: string): void {
    window.dispatchEvent(new CustomEvent('ravr-shortcut', { detail: { action } }));
  }
}

class AudioDeviceManager {
  private readonly audioContext?: AudioContext;

  async getAvailableDevices(): Promise<{ id: string; label: string }[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter((device) => device.kind === 'audiooutput')
        .map((device) => ({
          id: device.deviceId,
          label: device.label || `Audio Device ${device.deviceId.slice(0, 8)}`,
        }));
    } catch (error) {
      console.error('Failed to enumerate audio devices:', error);
      return [{ id: 'default', label: 'Default Audio Device' }];
    }
  }

  async setOutputDevice(deviceId: string): Promise<void> {
    // In a real implementation, this would configure the audio output
    console.log(`Setting audio output device to: ${deviceId}`);
  }

  async setSampleRate(sampleRate: number): Promise<void> {
    if (this.audioContext) {
      console.log(`Setting sample rate to: ${sampleRate}Hz`);
      // Note: Web Audio API doesn't allow changing sample rate after creation
      // This would require recreating the audio context
    }
  }

  async setBufferSize(bufferSize: number): Promise<void> {
    console.log(`Setting buffer size to: ${bufferSize} samples`);
    // Buffer size configuration would be implemented here
  }

  async setLatencyMode(mode: 'low' | 'balanced' | 'high'): Promise<void> {
    console.log(`Setting latency mode to: ${mode}`);
    // Latency mode configuration would be implemented here
  }

  async validateDevice(deviceId: string): Promise<boolean> {
    const devices = await this.getAvailableDevices();
    return devices.some((device) => device.id === deviceId);
  }
}

class ThemeManager {
  setTheme(theme: 'light' | 'dark' | 'auto'): void {
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  setAccentColor(color: string): void {
    document.documentElement.style.setProperty('--accent-color', color);
  }

  setFontSize(size: 'small' | 'medium' | 'large'): void {
    const sizes = {
      small: '14px',
      medium: '16px',
      large: '18px',
    };
    document.documentElement.style.setProperty('--base-font-size', sizes[size]);
  }

  setAnimationsEnabled(enabled: boolean): void {
    document.documentElement.style.setProperty('--animation-duration', enabled ? '0.2s' : '0s');
  }
}

export { SettingsManagerImpl as SettingsManager };
