import { useEffect, useCallback } from 'react';
import { useAudioStore } from '../store/audioStore';

interface KeyboardShortcuts {
  [key: string]: () => void;
}

export const useKeyboardShortcuts = () => {
  const { 
    isPlaying, 
    volume, 
    setVolume
  } = useAudioStore();

  const shortcuts: KeyboardShortcuts = {
    // Playback controls
    ' ': useCallback(() => {
      // Space bar - Play/Pause
      const audio = document.getElementById('ravr-audio') as HTMLAudioElement;
      if (audio) {
        if (isPlaying) {
          audio.pause();
        } else {
          audio.play().catch(console.error);
        }
      }
    }, [isPlaying]),

    'k': useCallback(() => {
      // K - Play/Pause (like YouTube/professional video editors)
      const audio = document.getElementById('ravr-audio') as HTMLAudioElement;
      if (audio) {
        if (isPlaying) {
          audio.pause();
        } else {
          audio.play().catch(console.error);
        }
      }
    }, [isPlaying]),

    'j': useCallback(() => {
      // J - Seek backward 10 seconds
      const audio = document.getElementById('ravr-audio') as HTMLAudioElement;
      if (audio) {
        audio.currentTime = Math.max(0, audio.currentTime - 10);
      }
    }, []),

    'l': useCallback(() => {
      // L - Seek forward 10 seconds
      const audio = document.getElementById('ravr-audio') as HTMLAudioElement;
      if (audio) {
        audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
      }
    }, []),

    'ArrowLeft': useCallback(() => {
      // Left arrow - Seek backward 5 seconds
      const audio = document.getElementById('ravr-audio') as HTMLAudioElement;
      if (audio) {
        audio.currentTime = Math.max(0, audio.currentTime - 5);
      }
    }, []),

    'ArrowRight': useCallback(() => {
      // Right arrow - Seek forward 5 seconds
      const audio = document.getElementById('ravr-audio') as HTMLAudioElement;
      if (audio) {
        audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5);
      }
    }, []),

    // Volume controls
    'ArrowUp': useCallback(() => {
      // Up arrow - Volume up
      setVolume(Math.min(1, volume + 0.1));
    }, [volume, setVolume]),

    'ArrowDown': useCallback(() => {
      // Down arrow - Volume down
      setVolume(Math.max(0, volume - 0.1));
    }, [volume, setVolume]),

    'm': useCallback(() => {
      // M - Mute/Unmute
      setVolume(volume > 0 ? 0 : 0.8);
    }, [volume, setVolume]),

    // Seek controls
    'Home': useCallback(() => {
      // Home - Go to beginning
      const audio = document.getElementById('ravr-audio') as HTMLAudioElement;
      if (audio) {
        audio.currentTime = 0;
      }
    }, []),

    'End': useCallback(() => {
      // End - Go to end
      const audio = document.getElementById('ravr-audio') as HTMLAudioElement;
      if (audio && audio.duration) {
        audio.currentTime = audio.duration - 1;
      }
    }, []),

    // Number keys for seeking to percentage
    '0': useCallback(() => seekToPercentage(0), []),
    '1': useCallback(() => seekToPercentage(10), []),
    '2': useCallback(() => seekToPercentage(20), []),
    '3': useCallback(() => seekToPercentage(30), []),
    '4': useCallback(() => seekToPercentage(40), []),
    '5': useCallback(() => seekToPercentage(50), []),
    '6': useCallback(() => seekToPercentage(60), []),
    '7': useCallback(() => seekToPercentage(70), []),
    '8': useCallback(() => seekToPercentage(80), []),
    '9': useCallback(() => seekToPercentage(90), []),

    // Professional shortcuts
    'f': useCallback(() => {
      // F - Toggle fullscreen visualizer
      // This would trigger fullscreen mode
      console.log('Toggle fullscreen visualizer');
    }, []),

    'v': useCallback(() => {
      // V - Toggle visualizer
      console.log('Toggle visualizer');
    }, []),

    'r': useCallback(() => {
      // R - Toggle repeat
      console.log('Toggle repeat mode');
    }, []),

    's': useCallback(() => {
      // S - Toggle shuffle
      console.log('Toggle shuffle mode');
    }, []),
  };

  const seekToPercentage = useCallback((percentage: number) => {
    const audio = document.getElementById('ravr-audio') as HTMLAudioElement;
    if (audio && audio.duration) {
      audio.currentTime = (audio.duration * percentage) / 100;
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        (event.target as HTMLElement)?.contentEditable === 'true'
      ) {
        return;
      }

      const key = event.key;
      const shortcut = shortcuts[key];

      if (shortcut) {
        event.preventDefault();
        event.stopPropagation();
        shortcut();
        
        // Show keyboard shortcut notification
        showShortcutNotification(key, getShortcutDescription(key));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);

  const getShortcutDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      ' ': 'Play/Pause',
      'k': 'Play/Pause',
      'j': 'Seek -10s',
      'l': 'Seek +10s',
      'ArrowLeft': 'Seek -5s',
      'ArrowRight': 'Seek +5s',
      'ArrowUp': 'Volume Up',
      'ArrowDown': 'Volume Down',
      'm': 'Mute/Unmute',
      'Home': 'Go to Start',
      'End': 'Go to End',
      'f': 'Fullscreen Visualizer',
      'v': 'Toggle Visualizer',
      'r': 'Repeat Mode',
      's': 'Shuffle Mode',
      '0': 'Seek to 0%',
      '1': 'Seek to 10%',
      '2': 'Seek to 20%',
      '3': 'Seek to 30%',
      '4': 'Seek to 40%',
      '5': 'Seek to 50%',
      '6': 'Seek to 60%',
      '7': 'Seek to 70%',
      '8': 'Seek to 80%',
      '9': 'Seek to 90%',
    };
    return descriptions[key] || 'Unknown';
  };

  const showShortcutNotification = (key: string, description: string) => {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `
      fixed top-4 right-4 z-50 
      bg-black/80 backdrop-blur-md 
      border border-cyan-400/30 
      text-white px-4 py-2 rounded-lg 
      shadow-lg shadow-cyan-500/20
      transition-all duration-300
      transform translate-x-0 opacity-100
    `;
    notification.innerHTML = `
      <div class="flex items-center gap-2">
        <div class="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs font-mono font-bold">
          ${key === ' ' ? 'SPACE' : key.toUpperCase()}
        </div>
        <span class="text-sm">${description}</span>
      </div>
    `;

    document.body.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0) translateY(0)';
    });

    // Remove after 2 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%) translateY(0)';
      notification.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 2000);
  };

  return { shortcuts };
};
