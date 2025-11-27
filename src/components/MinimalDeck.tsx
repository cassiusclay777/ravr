import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAudioStore } from '../store/audioStore';
import { initAutoDeviceDetection } from '@/utils/deviceDetect';
import { useAutoPlayer } from '../hooks/useAutoPlayer';
import { matchProfileByLabel } from '@/utils/profiles';

// Minimal 3-button deck with auto-everything
// - Load Track
// - Play
// - Stop
// Subtle status dot: green = optimal, orange = fallback

export const MinimalDeck: React.FC = () => {
  const player = useAutoPlayer();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    outputs,
    selectedOutputId,
    status,
    isPlaying,
    currentTime,
    duration,
    currentTrack,
    setSelectedOutput,
    setStatus,
    setProfile,
    setCurrentTrack,
  } = useAudioStore();

  // Initialize device monitor once
  useEffect(() => {
    const stopMonitor = initAutoDeviceDetection();
    return () => {
      stopMonitor?.();
    };
  }, []);

  // When outputs list changes or selection changes, attempt to set sink and pick profile
  useEffect(() => {
    if (!player) return;

    // Select profile by label (best effort)
    const selected = outputs.find((o) => o.id === (selectedOutputId ?? ''));
    const label = selected?.label ?? '';
    const profile = matchProfileByLabel(label);
    setProfile(profile);
    player.updateProfile(profile);

    // Route audio to selected sink if possible
    if (selectedOutputId) {
      void player.setSinkId(selectedOutputId).then((ok) => {
        setStatus(ok ? 'optimal' : 'fallback');
      });
    } else {
      setStatus('fallback');
    }
  }, [outputs, selectedOutputId, setProfile, setStatus, player]);

  const onClickLoad = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !player) return;

    const track = {
      id: Date.now().toString(),
      name: file.name,
      artist: 'Local File',
      album: 'Uploaded',
      duration: 0,
      url: URL.createObjectURL(file)
    };

    setCurrentTrack(track);
    const ok = await player.load(file);
    if (ok) await player.play();
    // reset so selecting same file triggers
    if (e.currentTarget) {
      e.currentTarget.value = '';
    }
  }, [player, setCurrentTrack]);

  const onClickPlay = useCallback(async () => {
    if (!player) return;
    if (isPlaying) {
      player.pause();
    } else {
      await player.play();
    }
  }, [isPlaying, player]);

  const onClickStop = useCallback(() => {
    player?.stop();
  }, [player]);

  const statusColor = useMemo(() => (status === 'optimal' ? 'bg-green-500' : 'bg-orange-500'), [status]);

  const format = (sec: number) => {
    if (!isFinite(sec) || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 select-none">
      <div className={`w-2 h-2 rounded-full ${statusColor}`} title={status} />
      <button onClick={onClickLoad} className="px-3 py-1 rounded bg-cyan-700 hover:bg-cyan-600 text-white text-sm">Load Track</button>
      <button onClick={onClickPlay} className="px-3 py-1 rounded bg-cyan-700 hover:bg-cyan-600 text-white text-sm">{isPlaying ? 'Pause' : 'Play'}</button>
      <button onClick={onClickStop} className="px-3 py-1 rounded bg-cyan-700 hover:bg-cyan-600 text-white text-sm">Stop</button>
      <div className="text-cyan-300 text-sm ml-2 truncate max-w-[40ch]" title={currentTrack?.name || 'No track'}>
        {currentTrack?.name || 'No track loaded'}
      </div>
      <div className="text-cyan-400 text-xs font-mono ml-2">{format(currentTime)} / {format(duration)}</div>
      <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={onFileChange} />
    </div>
  );
};

export default MinimalDeck;
