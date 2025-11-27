import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useAudioPlayer } from "../useAudioPlayer";
import Visualizer from "./Visualizer";
import Playlist from "./Playlist";
import { motion } from "framer-motion";

// Define DSPPreset type locally since we can't import it
interface DSPPreset {
  id: string;
  name: string;
  settings: {
    eq: { low: number; mid: number; high: number };
    stereoWidth: number;
    compressor: {
      threshold: number;
      ratio: number;
      attack: number;
      release: number;
      knee: number;
      makeupGain: number;
    };
    gain: { input: number; output: number };
  };
  createdAt: string;
  timestamp: number;
}

interface DSPControls {
  eq: { low: number; mid: number; high: number };
  stereoWidth: number;
  compressor: {
    threshold: number;
    ratio: number;
    attack: number;
    release: number;
    knee: number;
    makeupGain: number;
  };
  gain: { input: number; output: number };
  setEQ?: (eq: { low: number; mid: number; high: number }) => void;
  setStereoWidth?: (width: number) => void;
  setCompressor?: (settings: {
    threshold: number;
    ratio: number;
    attack: number;
    release: number;
    knee: number;
    makeupGain: number;
  }) => void;
  setGain?: (gain: { input: number; output: number }) => void;
  getCurrentSettings?: () => any;
  savePreset?: (name: string, settings: any) => void;
  loadPreset?: (name: string) => any;
}

// Define preset names as a union type
type DSPPresetName =
  | "default"
  | "bassBoost"
  | "vocalBoost"
  | "flat"
  | "rock"
  | "jazz"
  | "classical"
  | "dance"
  | "pop"
  | "custom";

interface Props {
  url?: string;
  preset?: DSPPreset;
  volume?: number;
  loop?: boolean;
  onPresetChange?: (preset: DSPPreset) => void;
  onVolumeChange?: (volume: number) => void;
  play?: () => Promise<void>;
  setVolume?: (volume: number) => void;
  loadAudio: (url: string | File, isBlob?: boolean) => Promise<boolean>;
}

const defaultPreset: DSPPreset = {
  id: "default",
  name: "Flat",
  settings: {
    eq: { low: 0, mid: 0, high: 0 },
    stereoWidth: 1.0,
    compressor: {
      threshold: -24,
      ratio: 12,
      attack: 0.003,
      release: 0.25,
      knee: 30,
      makeupGain: 0,
    },
    gain: { input: 0, output: 0 },
  },
  createdAt: new Date().toISOString(),
  timestamp: Date.now(),
};

interface AudioPlayerReturn {
  play: () => Promise<void>;
  pause: () => void;
  loadAudio: (url: string | File, isBlob?: boolean) => Promise<boolean>;
  setVolume: (volume: number) => void;
  analyzerNode: AnalyserNode | null;
  dspControls: DSPControls | null;
  isPlaying: boolean;
  isInitialized: boolean;
  currentTime: number;
  duration: number;
  error: string | null;
}

const Player: React.FC<Props> = ({
  url = "",
  preset = defaultPreset,
  volume = 0.8,
  loop = false,
  onPresetChange,
  onVolumeChange,
  play,
  setVolume,
  loadAudio,
}) => {
  // State management - remove duplicates and ensure proper typing
  const [currentPreset, setCurrentPreset] = useState<DSPPreset>({
    ...preset,
    createdAt: preset.createdAt || new Date().toISOString(),
    timestamp: preset.timestamp || Date.now(),
  });

  const [currentTrack, setCurrentTrack] = useState<string>(url);
  const [showEQ, setShowEQ] = useState<boolean>(true);
  const [showPlaylist, setShowPlaylist] = useState<boolean>(true);
  const [internalVolume, setInternalVolume] = useState<number>(volume);
  const [dspSettings, setDspSettings] = useState<DSPPreset["settings"]>(
    preset.settings
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Refs with proper typing
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const analyzerNodeRef = useRef<AnalyserNode | null>(null);

  // Audio player hook with proper typing
  const {
    play: playAudio,
    pause: pauseAudio,
    loadAudio: loadAudioPlayer,
    setVolume: setPlayerVolume,
    analyzerNode,
    dspControls,
    isPlaying: playerIsPlaying = false,
    isInitialized: playerIsInitialized = false,
    currentTime = 0,
    duration = 0,
    error: playerError = null,
  } = useAudioPlayer() as unknown as AudioPlayerReturn;

  // Format time in seconds to MM:SS
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Handle file input change
  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        const fileUrl = URL.createObjectURL(file);
        setCurrentTrack(fileUrl);
        loadAudioPlayer(fileUrl).catch(console.error);
      }
    },
    [loadAudioPlayer]
  );

  // Handle volume change
  const handleVolumeChange = useCallback(
    (newVolume: number) => {
      setInternalVolume(newVolume);
      setPlayerVolume(newVolume);
      if (onVolumeChange) {
        onVolumeChange(newVolume);
      }
    },
    [onVolumeChange, setPlayerVolume]
  );

  // Toggle play/pause
  const togglePlay = useCallback(async () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      try {
        await playAudio();
      } catch (error) {
        console.error("Error playing audio:", error);
      }
    }
  }, [isPlaying, playAudio, pauseAudio]);

  // Handle loading example track
  const handleLoadExample = useCallback(() => {
    // Example track URL - replace with your actual example track
    const exampleUrl = "/example-track.mp3";
    setCurrentTrack(exampleUrl);
    if (loadAudioPlayer) {
      loadAudioPlayer(exampleUrl);
    }
  }, [loadAudioPlayer]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  // Handle EQ band changes
  const handleEQChange = useCallback(
    (band: "low" | "mid" | "high", value: number) => {
      setDspSettings((prev) => ({
        ...prev,
        eq: { ...prev.eq, [band]: value },
      }));
    },
    []
  );

  // Handle compressor changes
  const handleCompressorChange = useCallback(
    (setting: keyof typeof dspSettings.compressor, value: number) => {
      setDspSettings((prev) => ({
        ...prev,
        compressor: { ...prev.compressor, [setting]: value },
      }));
    },
    []
  );

  // Define presets array with proper typing
  const presets: DSPPreset[] = [
    // Add your presets here or import them
    defaultPreset,
    // ...other presets
  ];

  // Handle preset change from dropdown
  const handlePresetSelect = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const presetName = event.target.value as string;
      // Find the preset by name or use default
      const selectedPreset =
        presets.find(
          (p: DSPPreset) => p.name.toLowerCase() === presetName.toLowerCase()
        ) || defaultPreset;
      setCurrentPreset(selectedPreset);
      setDspSettings(selectedPreset.settings);
      if (onPresetChange) {
        onPresetChange(selectedPreset);
      }
    },
    [onPresetChange, presets]
  );

  // Handle track selection
  const handleTrackSelect = useCallback(
    async (file: File) => {
      try {
        const fileUrl = URL.createObjectURL(file);
        setCurrentTrack(fileUrl);
        const loaded = await loadAudio(file, true);
        if (loaded && play) {
          await play();
        }
      } catch (err: unknown) {
        const error = err as Error;
        console.error("Error loading track:", error);
      }
    },
    [loadAudio, play]
  );

  // Sync player state with local state
  useEffect(() => {
    if (playerIsPlaying !== undefined) {
      setIsPlaying(playerIsPlaying);
    }
    if (playerIsInitialized !== undefined) {
      setIsInitialized(playerIsInitialized);
    }
  }, [playerIsPlaying, playerIsInitialized]);

  // Handle volume changes
  useEffect(() => {
    if (setVolume) {
      setVolume(volume);
      if (onVolumeChange) onVolumeChange(volume);
    }
  }, [volume, setVolume, onVolumeChange]);

  // Handle preset changes
  const savePreset = useCallback(
    (presetName: string) => {
      if (dspControls?.getCurrentSettings && dspControls?.savePreset) {
        const settings = dspControls.getCurrentSettings();
        dspControls.savePreset(presetName, settings);
        return true;
      }
      return false;
    },
    [dspControls]
  );

  const handlePresetChange = useCallback(
    (presetName: string) => {
      if (!dspControls?.loadPreset || !dspControls?.getCurrentSettings) return;

      // Apply the preset settings
      dspControls.loadPreset(presetName);

      // Update local state
      const settings = dspControls.getCurrentSettings();
      const newPreset: DSPPreset = {
        id: presetName,
        name: presetName.charAt(0).toUpperCase() + presetName.slice(1),
        settings,
        createdAt: new Date().toISOString(),
        timestamp: Date.now(),
      };

      setCurrentPreset(newPreset);
      if (onPresetChange) {
        onPresetChange(newPreset);
      }
    },
    [dspControls, onPresetChange]
  );

  // Update DSP settings when they change
  useEffect(() => {
    if (!dspControls) return;

    try {
      // Update EQ settings if they exist
      if (dspSettings.eq && dspControls.eq) {
        dspControls.eq.low = dspSettings.eq.low;
        dspControls.eq.mid = dspSettings.eq.mid;
        dspControls.eq.high = dspSettings.eq.high;
      }

      // Update stereo width if it exists
      if (
        dspSettings.stereoWidth !== undefined &&
        "stereoWidth" in dspControls
      ) {
        dspControls.stereoWidth = dspSettings.stereoWidth;
      }

      // Update compressor settings if they exist
      if (dspSettings.compressor && dspControls.compressor) {
        Object.keys(dspSettings.compressor).forEach((key) => {
          if (key in dspControls.compressor) {
            dspControls.compressor[key as keyof typeof dspSettings.compressor] =
              dspSettings.compressor[
                key as keyof typeof dspSettings.compressor
              ];
          }
        });
      }

      // Update gain settings if they exist
      if (dspSettings.gain && "gain" in dspControls) {
        dspControls.gain = dspSettings.gain;
      }
    } catch (error) {
      console.error("Error updating DSP settings:", error);
    }
  }, [dspSettings, dspControls]);

  // Handle initial load and URL changes
  useEffect(() => {
    if (currentTrack) {
      console.log("Loading track:", currentTrack);
      const loadTrack = async () => {
        try {
          const isBlobUrl = currentTrack.startsWith("blob:");
          let success = false;

          if (isBlobUrl) {
            // For blob URLs, we need to fetch the file first
            const response = await fetch(currentTrack);
            const blob = await response.blob();
            const file = new File([blob], "audio-file", { type: blob.type });
            success = await loadAudio(file, true);
          } else {
            // For regular URLs
            success = await loadAudio(currentTrack, false);
          }

          if (success) {
            console.log("Track loaded successfully");
            // Auto-play only if user has interacted with the page
            if (play) {
              try {
                await play();
              } catch (error) {
                console.log("Auto-play was prevented:", error);
                // Show play button for user interaction
              }
            }
          } else {
            console.error("Failed to load track");
          }
        } catch (error) {
          console.error("Error loading track:", error);
        }
      };
      loadTrack();
    }
  }, [currentTrack, loadAudio, play]);

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto">
      <div
        ref={containerRef}
        className="relative bg-gray-900 text-white p-6 rounded-xl shadow-2xl w-full"
      >
        {/* Audio visualization */}
        <div className="mb-6 w-full h-32 bg-black/20 rounded-lg overflow-hidden">
          {analyzerNode && (
            <div className="w-full h-full">
              <Visualizer analyzer={analyzerNode} />
            </div>
          )}
        </div>

        {/* Track info */}
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold mb-1">
            {currentTrack
              ? new URL(currentTrack).pathname.split("/").pop()
              : "No track selected"}
          </h2>
          <div className="text-gray-400 text-sm">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center space-x-4 mb-6">
          <button
            onClick={handleLoadExample}
            className="p-2 rounded-full bg-purple-600 hover:bg-purple-700 transition-colors"
            title="Load example track"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </button>

          <button
            onClick={togglePlay}
            className="p-4 rounded-full bg-purple-600 hover:bg-purple-700 transition-colors"
            disabled={!currentTrack}
          >
            {playerIsPlaying ? (
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
          </button>

          <div className="flex items-center space-x-2 w-48">
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 007.07 0 1 1 0 011.415 1.414 7 7 0 01-9.9 0 7 7 0 010-9.9 1 1 0 111.414 1.415z"
              />
            </svg>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={internalVolume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Preset selector */}
        <div className="flex items-center justify-center space-x-4 mb-6">
          <span className="text-sm text-gray-400">Preset:</span>
          <select
            value={currentPreset.name}
            onChange={handlePresetSelect}
            className="bg-gray-800 text-white rounded px-3 py-1 text-sm"
            disabled={!currentTrack}
          >
            <option value="flat">Flat</option>
            <option value="bassBoost">Bass Boost</option>
            <option value="vocalBoost">Vocal Boost</option>
            <option value="rock">Rock</option>
            <option value="jazz">Jazz</option>
            <option value="classical">Classical</option>
            <option value="dance">Dance</option>
            <option value="pop">Pop</option>
          </select>
        </div>
      </div>

      {/* DSP Controls Section */}
      {showEQ && dspControls && (
        <div className="mt-6 p-4 bg-gray-800 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* EQ Controls */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-purple-300">
                Equalizer
              </h3>
              <div className="space-y-4">
                {[
                  { label: "Low", key: "low", value: dspSettings.eq.low },
                  { label: "Mid", key: "mid", value: dspSettings.eq.mid },
                  { label: "High", key: "high", value: dspSettings.eq.high },
                ].map((band) => (
                  <div key={band.key} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{band.label}</span>
                      <span>{band.value} dB</span>
                    </div>
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="0.5"
                      value={band.value}
                      onChange={(e) =>
                        handleEQChange(
                          band.key as "low" | "mid" | "high",
                          parseFloat(e.target.value)
                        )
                      }
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Compressor Controls */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-purple-300">
                Compressor
              </h3>
              <div className="space-y-4">
                {[
                  {
                    label: "Threshold",
                    key: "threshold",
                    min: -60,
                    max: 0,
                    step: 1,
                    value: dspSettings.compressor.threshold,
                  },
                  {
                    label: "Ratio",
                    key: "ratio",
                    min: 1,
                    max: 20,
                    step: 0.5,
                    value: dspSettings.compressor.ratio,
                  },
                  {
                    label: "Attack",
                    key: "attack",
                    min: 0.001,
                    max: 1,
                    step: 0.001,
                    value: dspSettings.compressor.attack,
                  },
                  {
                    label: "Release",
                    key: "release",
                    min: 0.01,
                    max: 1,
                    step: 0.01,
                    value: dspSettings.compressor.release,
                  },
                  {
                    label: "Knee",
                    key: "knee",
                    min: 0,
                    max: 40,
                    step: 1,
                    value: dspSettings.compressor.knee,
                  },
                  {
                    label: "Makeup Gain",
                    key: "makeupGain",
                    min: 0,
                    max: 24,
                    step: 0.5,
                    value: dspSettings.compressor.makeupGain,
                  },
                ].map((setting) => (
                  <div key={setting.key} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{setting.label}</span>
                      <span>{setting.value}</span>
                    </div>
                    <input
                      type="range"
                      min={setting.min}
                      max={setting.max}
                      step={setting.step}
                      value={setting.value}
                      onChange={(e) =>
                        handleCompressorChange(
                          setting.key as keyof typeof dspSettings.compressor,
                          parseFloat(e.target.value)
                        )
                      }
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden audio element */}
      <audio
        ref={audioElementRef}
        src={currentTrack}
        loop={loop}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />
    </div>
  );
};

export default Player;
