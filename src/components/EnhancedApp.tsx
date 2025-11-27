import React, { useState, useEffect } from 'react';
import { AndroidIntegration } from './AndroidIntegration';
import { useMobileDetection } from './MobileOptimizations';

/**
 * Enhanced App wrapper with Android features
 * 
 * This component demonstrates how to integrate all Android features
 * into your existing RAVR Audio Player application.
 * 
 * Simply wrap your existing app with this component to enable:
 * - Enhanced Android UX with gestures
 * - Home screen widgets
 * - Voice control
 * - Camera scanner for CD covers
 */

interface EnhancedAppProps {
  children: React.ReactNode;
}

export const EnhancedApp: React.FC<EnhancedAppProps> = ({ children }) => {
  const { isAndroid, isMobile } = useMobileDetection();
  const [audioState, setAudioState] = useState({
    isPlaying: false,
    volume: 0.7,
    currentTime: 0,
    duration: 0,
    trackTitle: 'No Track',
    trackArtist: 'Unknown Artist',
    albumArt: '',
  });

  // Get audio element
  const getAudioElement = () => {
    return document.getElementById('ravr-audio') as HTMLAudioElement;
  };

  // Update audio state from audio element
  useEffect(() => {
    const audio = getAudioElement();
    if (!audio) return;

    const updateTime = () => {
      setAudioState(prev => ({
        ...prev,
        currentTime: audio.currentTime,
        duration: audio.duration || 0,
      }));
    };

    const updatePlayState = () => {
      setAudioState(prev => ({
        ...prev,
        isPlaying: !audio.paused,
      }));
    };

    const updateMetadata = () => {
      // Try to get metadata from audio element or other sources
      const title = audio.getAttribute('data-title') || 'No Track';
      const artist = audio.getAttribute('data-artist') || 'Unknown Artist';
      const albumArt = audio.getAttribute('data-cover') || '';

      setAudioState(prev => ({
        ...prev,
        trackTitle: title,
        trackArtist: artist,
        albumArt,
      }));
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('play', updatePlayState);
    audio.addEventListener('pause', updatePlayState);
    audio.addEventListener('loadedmetadata', updateMetadata);
    audio.addEventListener('ended', updatePlayState);

    // Initial state
    updatePlayState();
    updateMetadata();

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('play', updatePlayState);
      audio.removeEventListener('pause', updatePlayState);
      audio.removeEventListener('loadedmetadata', updateMetadata);
      audio.removeEventListener('ended', updatePlayState);
    };
  }, []);

  // Audio control handlers
  const handlePlayPause = () => {
    const audio = getAudioElement();
    if (!audio) return;

    if (audio.paused) {
      audio.play().catch(err => console.error('Play error:', err));
    } else {
      audio.pause();
    }
  };

  const handleStop = () => {
    const audio = getAudioElement();
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
  };

  const handleNext = () => {
    // Implement your next track logic here
    // This could dispatch an event or call a store action
    window.dispatchEvent(new CustomEvent('ravr:next-track'));
  };

  const handlePrevious = () => {
    // Implement your previous track logic here
    window.dispatchEvent(new CustomEvent('ravr:previous-track'));
  };

  const handleVolumeChange = (volume: number) => {
    const audio = getAudioElement();
    if (!audio) return;

    audio.volume = volume;
    setAudioState(prev => ({ ...prev, volume }));
  };

  const handleSeek = (time: number) => {
    const audio = getAudioElement();
    if (!audio) return;

    audio.currentTime = time;
  };

  const handleMetadataUpdate = (metadata: {
    title?: string;
    artist?: string;
    album?: string;
    year?: string;
    genre?: string;
    coverArt?: string;
  }) => {
    console.log('Metadata from camera scanner:', metadata);

    // Update audio state
    setAudioState(prev => ({
      ...prev,
      trackTitle: metadata.title || prev.trackTitle,
      trackArtist: metadata.artist || prev.trackArtist,
      albumArt: metadata.coverArt || prev.albumArt,
    }));

    // Update audio element attributes for persistence
    const audio = getAudioElement();
    if (audio) {
      if (metadata.title) audio.setAttribute('data-title', metadata.title);
      if (metadata.artist) audio.setAttribute('data-artist', metadata.artist);
      if (metadata.coverArt) audio.setAttribute('data-cover', metadata.coverArt);
    }

    // Dispatch event for other components to handle
    window.dispatchEvent(new CustomEvent('ravr:metadata-update', {
      detail: metadata
    }));

    // Show success notification
    showNotification('✓ Metadata aktualizována z CD obalu!');
  };

  const showNotification = (message: string) => {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-[9999] animate-fade-in';
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.classList.add('animate-fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  };

  return (
    <>
      {/* Original app content */}
      {children}

      {/* Android features overlay */}
      {(isAndroid || isMobile) && (
        <AndroidIntegration
          isPlaying={audioState.isPlaying}
          volume={audioState.volume}
          currentTime={audioState.currentTime}
          duration={audioState.duration}
          trackTitle={audioState.trackTitle}
          trackArtist={audioState.trackArtist}
          albumArt={audioState.albumArt}
          onPlayPause={handlePlayPause}
          onStop={handleStop}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onVolumeChange={handleVolumeChange}
          onSeek={handleSeek}
          onMetadataUpdate={handleMetadataUpdate}
        />
      )}
    </>
  );
};

// CSS for animations (add to your global CSS or tailwind config)
const styles = `
@keyframes fade-in {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fade-out {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-10px); }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}

.animate-fade-out {
  animation: fade-out 0.3s ease-out;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}

/**
 * Usage Example:
 * 
 * In your main.tsx or App.tsx:
 * 
 * import { EnhancedApp } from './components/EnhancedApp';
 * 
 * function App() {
 *   return (
 *     <EnhancedApp>
 *       <YourExistingApp />
 *     </EnhancedApp>
 *   );
 * }
 */
