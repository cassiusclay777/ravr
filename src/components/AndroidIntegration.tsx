import React, { useState, useEffect } from 'react';
import { AndroidPlayer } from './AndroidPlayer';
import { VoiceControl, useVoiceCommands, VoiceControlSettings } from './VoiceControl';
import { CameraScannerButton } from './CameraScanner';
import { useAndroidWidget } from '@/hooks/useAndroidWidget';
import { useMobileDetection } from './MobileOptimizations';

interface AndroidIntegrationProps {
  // Audio state
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  trackTitle?: string;
  trackArtist?: string;
  albumArt?: string;

  // Audio controls
  onPlayPause: () => void;
  onStop: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onVolumeChange: (volume: number) => void;
  onSeek?: (time: number) => void;

  // Metadata handling
  onMetadataUpdate?: (metadata: {
    title?: string;
    artist?: string;
    album?: string;
    year?: string;
    genre?: string;
    coverArt?: string;
  }) => void;
}

export const AndroidIntegration: React.FC<AndroidIntegrationProps> = ({
  isPlaying,
  volume,
  currentTime,
  duration,
  trackTitle,
  trackArtist,
  albumArt,
  onPlayPause,
  onStop,
  onNext,
  onPrevious,
  onVolumeChange,
  onSeek,
  onMetadataUpdate,
}) => {
  const { isAndroid, isMobile } = useMobileDetection();
  const [voiceControlEnabled, setVoiceControlEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Volume control helpers
  const handleVolumeUp = () => {
    const newVolume = Math.min(1, volume + 0.1);
    onVolumeChange(newVolume);
  };

  const handleVolumeDown = () => {
    const newVolume = Math.max(0, volume - 0.1);
    onVolumeChange(newVolume);
  };

  const handleMute = () => {
    onVolumeChange(volume > 0 ? 0 : 0.5);
  };

  // Setup Android widget
  useAndroidWidget(
    isPlaying,
    trackTitle || 'No Track',
    trackArtist || 'Unknown Artist',
    onPlayPause,
    onNext,
    onPrevious,
    onStop
  );

  // Voice commands
  const voiceCommands = useVoiceCommands(
    isPlaying,
    onPlayPause,
    onStop,
    onNext,
    onPrevious,
    handleVolumeUp,
    handleVolumeDown,
    handleMute
  );

  const handleVoiceCommandRecognized = (command: string) => {
    console.log('Voice command recognized:', command);
    // Show visual feedback
    const notification = document.createElement('div');
    notification.textContent = `✓ ${command}`;
    notification.className = 'fixed top-20 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in';
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
  };

  if (!isAndroid && !isMobile) {
    return null;
  }

  return (
    <>
      {/* Android Player - Enhanced UI with gestures */}
      <AndroidPlayer
        isPlaying={isPlaying}
        onPlayPause={onPlayPause}
        onStop={onStop}
        onNext={onNext}
        onPrevious={onPrevious}
        volume={volume}
        onVolumeChange={onVolumeChange}
        currentTime={currentTime}
        duration={duration}
        onSeek={onSeek}
        trackTitle={trackTitle}
        trackArtist={trackArtist}
        albumArt={albumArt}
      />

      {/* Voice Control */}
      {voiceControlEnabled && (
        <VoiceControl
          commands={voiceCommands}
          onCommandRecognized={handleVoiceCommandRecognized}
        />
      )}

      {/* Settings FAB */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="fixed top-20 left-4 w-14 h-14 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all shadow-lg z-40 backdrop-blur-sm border border-white/20"
        style={{ minWidth: '56px', minHeight: '56px' }}
      >
        <span className="text-2xl">⚙️</span>
      </button>

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-gradient-to-b from-gray-900 to-black rounded-t-3xl md:rounded-3xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto border-t border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">📱 Android nastavení</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all"
              >
                <span className="text-xl">✕</span>
              </button>
            </div>

            <div className="space-y-6">
              {/* Voice Control Settings */}
              <VoiceControlSettings
                isEnabled={voiceControlEnabled}
                onToggle={setVoiceControlEnabled}
              />

              {/* Camera Scanner */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-white font-bold text-lg mb-2">📷 Skenování CD/Vinyl</h3>
                <p className="text-white/60 text-sm mb-4">
                  Namiřte kameru na obal alba pro automatické rozpoznání metadat
                </p>
                {onMetadataUpdate && (
                  <CameraScannerButton onMetadataDetected={onMetadataUpdate} />
                )}
              </div>

              {/* Widget Info */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-white font-bold text-lg mb-2">📲 Widget</h3>
                <p className="text-white/60 text-sm mb-3">
                  Přidejte RAVR widget na domovskou obrazovku pro rychlý přístup k ovládání
                </p>
                <div className="bg-cyan-600/20 rounded-lg p-3 border border-cyan-600/30">
                  <p className="text-cyan-400 text-xs">
                    💡 Dlouze podržte na domovské obrazovce → Widgety → RAVR Audio
                  </p>
                </div>
              </div>

              {/* Gestures Info */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-white font-bold text-lg mb-2">👆 Gesta</h3>
                <div className="space-y-2 text-sm text-white/70">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👈</span>
                    <span>Swipe vlevo - Další skladba</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👉</span>
                    <span>Swipe vpravo - Předchozí skladba</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👆</span>
                    <span>Swipe nahoru - Zobrazit hlasitost</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👇</span>
                    <span>Swipe dolů - Skrýt hlasitost</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👆👆</span>
                    <span>Double tap - Play/Pause</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👆⏱️</span>
                    <span>Long press - Stop</span>
                  </div>
                </div>
              </div>

              {/* Haptic Feedback */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-bold text-lg">📳 Vibrační odezva</h3>
                    <p className="text-white/60 text-sm">Haptická zpětná vazba pro gesta</p>
                  </div>
                  <div className="text-green-500 text-2xl">✓</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
