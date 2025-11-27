import { useEffect } from 'react';
import AndroidWidget from '@/plugins/AndroidWidgetPlugin';
import { useMobileDetection } from '@/components/MobileOptimizations';

export const useAndroidWidget = (
  isPlaying: boolean,
  trackTitle: string,
  trackArtist: string,
  onPlayPause: () => void,
  onNext?: () => void,
  onPrevious?: () => void,
  onStop?: () => void
) => {
  const { isAndroid } = useMobileDetection();

  useEffect(() => {
    if (!isAndroid) return;

    // Register global widget command handlers
    window.androidWidgetPlayPause = onPlayPause;
    window.androidWidgetNext = onNext || (() => console.log('Next not available'));
    window.androidWidgetPrevious = onPrevious || (() => console.log('Previous not available'));
    window.androidWidgetStop = onStop || (() => console.log('Stop not available'));

    return () => {
      // Cleanup
      delete window.androidWidgetPlayPause;
      delete window.androidWidgetNext;
      delete window.androidWidgetPrevious;
      delete window.androidWidgetStop;
    };
  }, [isAndroid, onPlayPause, onNext, onPrevious, onStop]);

  // Update widget when playback state changes
  useEffect(() => {
    if (!isAndroid) return;

    AndroidWidget.updateWidget({
      isPlaying,
      trackTitle: trackTitle || 'No Track',
      artist: trackArtist || 'Unknown Artist',
    }).catch((error) => {
      console.error('Failed to update widget:', error);
    });
  }, [isAndroid, isPlaying, trackTitle, trackArtist]);

  // Notify widget of playback state changes
  const notifyPlaybackState = (state: 'playing' | 'paused' | 'stopped') => {
    if (!isAndroid) return;

    AndroidWidget.notifyPlaybackState({
      state,
      trackTitle: trackTitle || 'No Track',
      artist: trackArtist || 'Unknown Artist',
    }).catch((error) => {
      console.error('Failed to notify playback state:', error);
    });
  };

  return { notifyPlaybackState };
};
