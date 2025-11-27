# 🔧 Příklad integrace Android funkcí do existující aplikace

## Krok 1: Minimal Integration (nejjednodušší způsob)

### V `src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { EnhancedApp } from './components/EnhancedApp';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <EnhancedApp>
        <App />
      </EnhancedApp>
    </BrowserRouter>
  </React.StrictMode>
);
```

**Hotovo!** Všechny Android funkce jsou nyní aktivní. 🎉

---

## Krok 2: Custom Integration (pokročilé)

Pokud chceš více kontroly nad Android funkcemi:

### V `src/App.tsx`:

```tsx
import React, { useState, useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AndroidIntegration } from './components/AndroidIntegration';
import { useMobileDetection } from './components/MobileOptimizations';

// Your existing imports...
import { Navigation } from './components/Navigation';
import { Player } from './components/Player';
// ... etc

export default function App() {
  const { isAndroid, isMobile } = useMobileDetection();
  
  // Audio state (connect to your existing audio system)
  const [audioState, setAudioState] = useState({
    isPlaying: false,
    volume: 0.7,
    currentTime: 0,
    duration: 0,
    trackTitle: 'No Track',
    trackArtist: 'Unknown Artist',
    albumArt: '',
  });

  // Connect to your audio player
  useEffect(() => {
    const audio = document.getElementById('ravr-audio') as HTMLAudioElement;
    if (!audio) return;

    const updateState = () => {
      setAudioState({
        isPlaying: !audio.paused,
        volume: audio.volume,
        currentTime: audio.currentTime,
        duration: audio.duration || 0,
        trackTitle: audio.getAttribute('data-title') || 'No Track',
        trackArtist: audio.getAttribute('data-artist') || 'Unknown Artist',
        albumArt: audio.getAttribute('data-cover') || '',
      });
    };

    audio.addEventListener('timeupdate', updateState);
    audio.addEventListener('play', updateState);
    audio.addEventListener('pause', updateState);

    return () => {
      audio.removeEventListener('timeupdate', updateState);
      audio.removeEventListener('play', updateState);
      audio.removeEventListener('pause', updateState);
    };
  }, []);

  // Your existing app content
  return (
    <>
      {/* Your existing routes */}
      <Navigation />
      <Routes>
        <Route path="/" element={<Player />} />
        {/* ... your other routes */}
      </Routes>

      {/* Add Android features */}
      {(isAndroid || isMobile) && (
        <AndroidIntegration
          isPlaying={audioState.isPlaying}
          volume={audioState.volume}
          currentTime={audioState.currentTime}
          duration={audioState.duration}
          trackTitle={audioState.trackTitle}
          trackArtist={audioState.trackArtist}
          albumArt={audioState.albumArt}
          onPlayPause={() => {
            const audio = document.getElementById('ravr-audio') as HTMLAudioElement;
            audio?.paused ? audio?.play() : audio?.pause();
          }}
          onStop={() => {
            const audio = document.getElementById('ravr-audio') as HTMLAudioElement;
            if (audio) {
              audio.pause();
              audio.currentTime = 0;
            }
          }}
          onNext={() => {
            // Your next track logic
            window.dispatchEvent(new CustomEvent('ravr:next-track'));
          }}
          onPrevious={() => {
            // Your previous track logic
            window.dispatchEvent(new CustomEvent('ravr:previous-track'));
          }}
          onVolumeChange={(vol) => {
            const audio = document.getElementById('ravr-audio') as HTMLAudioElement;
            if (audio) audio.volume = vol;
          }}
          onSeek={(time) => {
            const audio = document.getElementById('ravr-audio') as HTMLAudioElement;
            if (audio) audio.currentTime = time;
          }}
          onMetadataUpdate={(metadata) => {
            console.log('Metadata from camera:', metadata);
            // Update your track metadata
          }}
        />
      )}
    </>
  );
}
```

---

## Krok 3: Selective Integration (jen některé funkce)

Pokud chceš jen některé funkce:

### Jen Gestures:

```tsx
import { useAndroidGestures } from './hooks/useAndroidGestures';

function MyPlayer() {
  useAndroidGestures({
    onSwipeLeft: () => nextTrack(),
    onSwipeRight: () => previousTrack(),
    onSwipeUp: () => showVolume(),
    onSwipeDown: () => hideVolume(),
    onDoubleTap: () => togglePlayPause(),
    onLongPress: () => stop(),
  });

  return <YourPlayerUI />;
}
```

### Jen Voice Control:

```tsx
import { VoiceControl, useVoiceCommands } from './components/VoiceControl';

function MyApp() {
  const commands = useVoiceCommands(
    isPlaying,
    togglePlay,
    stop,
    nextTrack,
    previousTrack,
    volumeUp,
    volumeDown,
    mute
  );

  return (
    <>
      <YourApp />
      <VoiceControl 
        commands={commands}
        onCommandRecognized={(cmd) => console.log('Command:', cmd)}
      />
    </>
  );
}
```

### Jen Widget:

```tsx
import { useAndroidWidget } from './hooks/useAndroidWidget';

function MyApp() {
  useAndroidWidget(
    isPlaying,
    trackTitle,
    trackArtist,
    togglePlay,
    nextTrack,
    previousTrack,
    stop
  );

  return <YourApp />;
}
```

### Jen Camera Scanner:

```tsx
import { CameraScannerButton } from './components/CameraScanner';

function MyLibrary() {
  return (
    <div>
      <h1>My Library</h1>
      <CameraScannerButton
        onMetadataDetected={(metadata) => {
          console.log('Scanned:', metadata);
          updateTrackMetadata(metadata);
        }}
      />
    </div>
  );
}
```

---

## Krok 4: Store Integration (Redux/Zustand)

### S Redux:

```tsx
import { useDispatch, useSelector } from 'react-redux';
import { AndroidIntegration } from './components/AndroidIntegration';

function App() {
  const dispatch = useDispatch();
  const audioState = useSelector(state => state.audio);

  return (
    <AndroidIntegration
      {...audioState}
      onPlayPause={() => dispatch({ type: 'TOGGLE_PLAY' })}
      onStop={() => dispatch({ type: 'STOP' })}
      onNext={() => dispatch({ type: 'NEXT_TRACK' })}
      onPrevious={() => dispatch({ type: 'PREV_TRACK' })}
      onVolumeChange={(vol) => dispatch({ type: 'SET_VOLUME', payload: vol })}
      onSeek={(time) => dispatch({ type: 'SEEK', payload: time })}
      onMetadataUpdate={(meta) => dispatch({ type: 'UPDATE_METADATA', payload: meta })}
    />
  );
}
```

### S Zustand:

```tsx
import { useAudioStore } from './store/audioStore';
import { AndroidIntegration } from './components/AndroidIntegration';

function App() {
  const {
    isPlaying,
    volume,
    currentTime,
    duration,
    trackTitle,
    trackArtist,
    togglePlay,
    stop,
    nextTrack,
    previousTrack,
    setVolume,
    seek,
    updateMetadata,
  } = useAudioStore();

  return (
    <AndroidIntegration
      isPlaying={isPlaying}
      volume={volume}
      currentTime={currentTime}
      duration={duration}
      trackTitle={trackTitle}
      trackArtist={trackArtist}
      onPlayPause={togglePlay}
      onStop={stop}
      onNext={nextTrack}
      onPrevious={previousTrack}
      onVolumeChange={setVolume}
      onSeek={seek}
      onMetadataUpdate={updateMetadata}
    />
  );
}
```

---

## Krok 5: Event-Based Integration

Pokud chceš používat custom events:

```tsx
// Setup listeners
useEffect(() => {
  const handleNextTrack = () => {
    // Your next track logic
    console.log('Next track requested');
  };

  const handlePreviousTrack = () => {
    // Your previous track logic
    console.log('Previous track requested');
  };

  const handleMetadataUpdate = (e: CustomEvent) => {
    console.log('Metadata updated:', e.detail);
    // Update your state
  };

  window.addEventListener('ravr:next-track', handleNextTrack);
  window.addEventListener('ravr:previous-track', handlePreviousTrack);
  window.addEventListener('ravr:metadata-update', handleMetadataUpdate as EventListener);

  return () => {
    window.removeEventListener('ravr:next-track', handleNextTrack);
    window.removeEventListener('ravr:previous-track', handlePreviousTrack);
    window.removeEventListener('ravr:metadata-update', handleMetadataUpdate as EventListener);
  };
}, []);
```

---

## Testing Your Integration

### 1. Test Gestures:
```tsx
// Add console logs to verify gestures work
useAndroidGestures({
  onSwipeLeft: () => console.log('Swipe left detected!'),
  onSwipeRight: () => console.log('Swipe right detected!'),
  onDoubleTap: () => console.log('Double tap detected!'),
});
```

### 2. Test Voice Control:
```tsx
<VoiceControl
  commands={commands}
  onCommandRecognized={(cmd) => {
    console.log('Voice command:', cmd);
    alert(`Command recognized: ${cmd}`);
  }}
/>
```

### 3. Test Widget:
- Long press on home screen
- Add RAVR widget
- Play a track
- Check if widget updates

### 4. Test Camera Scanner:
- Open scanner
- Point at any text
- Check console for extracted metadata

---

## Common Issues & Solutions

### Issue: Gestures not working
**Solution:** 
```tsx
// Make sure component is mounted and has touch-action style
<div style={{ touchAction: 'none' }}>
  {/* Your content */}
</div>
```

### Issue: Voice control not starting
**Solution:**
```tsx
// Check if SpeechRecognition is available
useEffect(() => {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  console.log('SpeechRecognition available:', !!SR);
}, []);
```

### Issue: Widget not updating
**Solution:**
```tsx
// Force widget update
import AndroidWidget from './plugins/AndroidWidgetPlugin';

AndroidWidget.updateWidget({
  isPlaying: true,
  trackTitle: 'Test Track',
  artist: 'Test Artist',
});
```

### Issue: Camera not opening
**Solution:**
```tsx
// Check camera permissions
navigator.mediaDevices.getUserMedia({ video: true })
  .then(() => console.log('Camera permission granted'))
  .catch(err => console.error('Camera permission denied:', err));
```

---

## Performance Tips

### 1. Lazy load Android features:
```tsx
const AndroidIntegration = lazy(() => import('./components/AndroidIntegration'));

{isAndroid && (
  <Suspense fallback={<div>Loading...</div>}>
    <AndroidIntegration {...props} />
  </Suspense>
)}
```

### 2. Memoize callbacks:
```tsx
const handlePlayPause = useCallback(() => {
  // Your play/pause logic
}, [dependencies]);
```

### 3. Debounce state updates:
```tsx
const debouncedSeek = useMemo(
  () => debounce((time: number) => {
    // Seek logic
  }, 100),
  []
);
```

---

## Summary

**Nejjednodušší způsob (doporučeno):**
```tsx
import { EnhancedApp } from './components/EnhancedApp';

<EnhancedApp>
  <YourApp />
</EnhancedApp>
```

**Custom způsob:**
```tsx
import { AndroidIntegration } from './components/AndroidIntegration';

<AndroidIntegration {...audioState} {...audioHandlers} />
```

**Selective způsob:**
```tsx
import { useAndroidGestures } from './hooks/useAndroidGestures';
import { VoiceControl } from './components/VoiceControl';
import { CameraScannerButton } from './components/CameraScanner';

// Use only what you need
```

---

**Vyberte způsob, který nejlépe vyhovuje vaší aplikaci!** 🚀
