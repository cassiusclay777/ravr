import { registerPlugin } from '@capacitor/core';

export interface AndroidWidgetPlugin {
  updateWidget(options: {
    isPlaying: boolean;
    trackTitle: string;
    artist: string;
  }): Promise<{ success: boolean }>;

  notifyPlaybackState(options: {
    state: 'playing' | 'paused' | 'stopped';
    trackTitle: string;
    artist: string;
  }): Promise<{ success: boolean }>;
}

const AndroidWidget = registerPlugin<AndroidWidgetPlugin>('AndroidWidget', {
  web: () => ({
    // Web implementation (fallback)
    async updateWidget() {
      console.log('AndroidWidget.updateWidget not available on web');
      return { success: false };
    },
    async notifyPlaybackState() {
      console.log('AndroidWidget.notifyPlaybackState not available on web');
      return { success: false };
    },
  }),
});

export default AndroidWidget;

// Global functions for widget commands
declare global {
  interface Window {
    androidWidgetPlayPause?: () => void;
    androidWidgetNext?: () => void;
    androidWidgetPrevious?: () => void;
    androidWidgetStop?: () => void;
  }
}
