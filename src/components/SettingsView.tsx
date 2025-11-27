import React, { useEffect, useState } from 'react';
import { Card } from './ui/Card';

interface AudioDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

interface SettingsData {
  audioOutput: string;
  bufferSize: number;
  sampleRate: number;
  theme: 'dark' | 'light' | 'auto';
  keyboardShortcuts: boolean;
  notifications: boolean;
}

const DEFAULT_SETTINGS: SettingsData = {
  audioOutput: 'default',
  bufferSize: 1024,
  sampleRate: 44100,
  theme: 'dark',
  keyboardShortcuts: true,
  notifications: true,
};

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [loading, setLoading] = useState(true);

  // Load settings from localStorage
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('ravrSettings');
      if (savedSettings) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    setLoading(false);
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    if (!loading) {
      try {
        localStorage.setItem('ravrSettings', JSON.stringify(settings));
      } catch (error) {
        console.error('Error saving settings:', error);
      }
    }
  }, [settings, loading]);

  // Load audio devices
  useEffect(() => {
    const loadAudioDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices
          .filter((device) => device.kind === 'audiooutput')
          .map((device) => ({
            deviceId: device.deviceId,
            label: device.label || `Audio Device ${device.deviceId.slice(0, 8)}`,
            kind: device.kind,
          }));
        setAudioDevices(audioOutputs);
      } catch (error) {
        console.error('Error loading audio devices:', error);
      }
    };

    loadAudioDevices();
  }, []);

  const handleSettingChange = <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-300">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      {/* Audio Settings */}
      <Card title="Audio Settings">
        <div className="space-y-4">
          <div>
            <label htmlFor="audioOutput" className="block text-sm font-medium text-slate-300 mb-2">
              Audio Output Device
            </label>
            <select
              id="audioOutput"
              value={settings.audioOutput}
              onChange={(e) => handleSettingChange('audioOutput', e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="default">Default</option>
              {audioDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="bufferSize" className="block text-sm font-medium text-slate-300 mb-2">
              Buffer Size: {settings.bufferSize} samples
            </label>
            <input
              id="bufferSize"
              type="range"
              min="256"
              max="4096"
              step="256"
              value={settings.bufferSize}
              onChange={(e) => handleSettingChange('bufferSize', parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>256 (Low latency)</span>
              <span>4096 (High stability)</span>
            </div>
          </div>

          <div>
            <label htmlFor="sampleRate" className="block text-sm font-medium text-slate-300 mb-2">Sample Rate</label>
            <select
              id="sampleRate"
              value={settings.sampleRate}
              onChange={(e) => handleSettingChange('sampleRate', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value={44100}>44.1 kHz</option>
              <option value={48000}>48 kHz</option>
              <option value={88200}>88.2 kHz</option>
              <option value={96000}>96 kHz</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Appearance Settings */}
      <Card title="Appearance">
        <div className="space-y-4">
          <div>
            <label htmlFor="theme" className="block text-sm font-medium text-slate-300 mb-2">Theme</label>
            <select
              id="theme"
              value={settings.theme}
              onChange={(e) =>
                handleSettingChange('theme', e.target.value as 'dark' | 'light' | 'auto')
              }
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="auto">Auto (System)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Interface Settings */}
      <Card title="Interface">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label htmlFor="keyboardShortcuts" className="text-sm font-medium text-slate-300">Enable Keyboard Shortcuts</label>
            <input
              id="keyboardShortcuts"
              type="checkbox"
              checked={settings.keyboardShortcuts}
              onChange={(e) => handleSettingChange('keyboardShortcuts', e.target.checked)}
              className="h-4 w-4 text-cyan-600 bg-slate-700 border-slate-600 rounded focus:ring-cyan-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <label htmlFor="notifications" className="text-sm font-medium text-slate-300">Show Notifications</label>
            <input
              id="notifications"
              type="checkbox"
              checked={settings.notifications}
              onChange={(e) => handleSettingChange('notifications', e.target.checked)}
              className="h-4 w-4 text-cyan-600 bg-slate-700 border-slate-600 rounded focus:ring-cyan-500"
            />
          </div>
        </div>
      </Card>

      {/* Keyboard Shortcuts Help */}
      {settings.keyboardShortcuts && (
        <Card title="Keyboard Shortcuts">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <code className="bg-slate-700 px-2 py-1 rounded">Space</code>
                <span className="text-slate-300">Play/Pause</span>
              </div>
              <div className="flex justify-between">
                <code className="bg-slate-700 px-2 py-1 rounded">←/→</code>
                <span className="text-slate-300">Seek ±10s</span>
              </div>
              <div className="flex justify-between">
                <code className="bg-slate-700 px-2 py-1 rounded">↑/↓</code>
                <span className="text-slate-300">Volume ±5%</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <code className="bg-slate-700 px-2 py-1 rounded">M</code>
                <span className="text-slate-300">Mute</span>
              </div>
              <div className="flex justify-between">
                <code className="bg-slate-700 px-2 py-1 rounded">F</code>
                <span className="text-slate-300">Fullscreen</span>
              </div>
              <div className="flex justify-between">
                <code className="bg-slate-700 px-2 py-1 rounded">R</code>
                <span className="text-slate-300">Reset EQ</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Reset Settings */}
      <div className="flex justify-end">
        <button
          onClick={resetSettings}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
};

export default SettingsView;
