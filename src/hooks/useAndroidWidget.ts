import { useEffect } from 'react';

/**
 * Custom hook for Android home screen widget integration
 * Updates the widget with current playback state and track information
 */
export function useAndroidWidget(
  isPlaying: boolean,
  trackTitle: string,
  trackArtist: string,
  onPlayPause?: () => void,
  onNext?: () => void,
  onPrevious?: () => void,
  onStop?: () => void
) {
  useEffect(() => {
    // Check if we're running in an Android environment
    const isAndroid = /Android/.test(navigator.userAgent);

    if (!isAndroid) return;

    // Register global widget command handlers
    if (typeof window !== 'undefined') {
      (window as any).androidWidgetPlayPause = onPlayPause;
      (window as any).androidWidgetNext = onNext || (() => console.log('Next not available'));
      (window as any).androidWidgetPrevious = onPrevious || (() => console.log('Previous not available'));
      (window as any).androidWidgetStop = onStop || (() => console.log('Stop not available'));
    }

    return () => {
      // Cleanup
      if (typeof window !== 'undefined') {
        delete (window as any).androidWidgetPlayPause;
        delete (window as any).androidWidgetNext;
        delete (window as any).androidWidgetPrevious;
        delete (window as any).androidWidgetStop;
      }
    };
  }, [onPlayPause, onNext, onPrevious, onStop]);

  // Update widget when playback state changes
  useEffect(() => {
    const isAndroid = /Android/.test(navigator.userAgent);

    if (!isAndroid) return;

    // Try to update the widget if the native interface is available
    if (typeof window !== 'undefined' && (window as any).AndroidWidget) {
      try {
        (window as any).AndroidWidget.updateWidget({
          isPlaying,
          trackTitle: trackTitle || 'No Track',
          artist: trackArtist || 'Unknown Artist',
        });
      } catch (error) {
        console.warn('Failed to update Android widget:', error);
      }
    }
  }, [isPlaying, trackTitle, trackArtist]);
}
