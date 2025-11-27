// src/App.tsx
import React, { lazy, Suspense, useState, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { Navigation } from "./components/Navigation";
import { ProfessionalDSP } from "@/components/ProfessionalDSP";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { EuphFormatTester } from "@/components/EuphFormatTester";
import { WelcomeAudioDemo } from "@/components/WelcomeAudioDemo";
import Background from "@/components/Background";
import VisualizerFull from "./components/VisualizerFull";
import VisualizerControls from "./components/VisualizerControls";
import { NowPlaying } from "./components/NowPlaying";
import { CompactPlayer, shouldShowCompactPlayer } from "./components/CompactPlayer";
import { LibraryPanel } from "./components/LibraryPanel";
import { Layout } from "./components/Layout";
import TopBarHiFi from "./components/TopBarHiFi";
import { DspQuick } from "./components/DspQuick";
import { AutoMasterPanel } from "./components/AutoMasterPanel";
import WasmDspControls from "./components/WasmDspControls";
// Import will be used in the DspView component
const AIMasteringPanel = lazy(() =>
  import("./components/AIMasteringPanel").then((module) => ({
    default: module.default as unknown as React.ComponentType<any>,
  }))
);

const TrackDetectionPage = lazy(async () => {
  const module = await import("./pages/TrackDetectionPage");
  return { default: module.default as unknown as React.ComponentType<any> };
});

const ModelTestPage = lazy(async () => {
  const module = await import("./pages/ModelTestPage");
  return { default: module.ModelTestPage as unknown as React.ComponentType<any> };
});

const EuphTestPage = lazy(async () => {
  const module = await import("./pages/EuphTestPage");
  return { default: module.EuphTestPage as unknown as React.ComponentType<any> };
});
const EuphLivePage = lazy(async () => {
  const module = await import("./pages/EuphLivePage");
  return { default: module.default as unknown as React.ComponentType<any> };
});


import "./App.css";

import SettingsViewComponent from "./components/SettingsView";

const AdvancedPlayerPage = lazy(async () => {
  const module = await import("./components/AdvancedPlayerPage");
  return { default: module.default as unknown as React.ComponentType<any> };
});

// Ensure audio element exists in the DOM
function ensureAudioElement() {
  if (typeof document === "undefined") return;

  let audioElement = document.getElementById("ravr-audio") as HTMLAudioElement;
  if (!audioElement) {
    audioElement = document.createElement("audio");
    audioElement.id = "ravr-audio";
    audioElement.className = "hidden";
    document.body.appendChild(audioElement);
  }
  return audioElement;
}

function AppContent() {
  const location = useLocation();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [fullscreenViz, setFullscreenViz] = useState(false);
  const [libOpen, setLibOpen] = useState(false);

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  // Ensure audio element exists when component mounts
  useEffect(() => {
    ensureAudioElement();

    // Cleanup function to remove the audio element when the app unmounts
    return () => {
      const audioElement = document.getElementById("ravr-audio");
      audioElement?.parentNode?.removeChild(audioElement);
    };
  }, []);

  // Check if we should show compact player
  const showCompact = shouldShowCompactPlayer(location.pathname);

  if (showAdvanced)
    return (
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-screen">
            Loading Advanced Player...
          </div>
        }
      >
        <AdvancedPlayerPage onBack={() => setShowAdvanced(false)} />
      </Suspense>
    );

  return (
    <>
      <Background />
      <VisualizerFull isActive={fullscreenViz} />

      {/* Compact Player - sticky at top for DSP/Settings/Tracks */}
      {showCompact && <CompactPlayer />}

      <Layout style={showCompact ? { paddingTop: '60px' } : undefined}>
        <header className="mb-6 flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-xl shadow-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.812L4.816 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.816l3.567-2.812a1 1 0 011.617.888zM15.195 7.05a1 1 0 011.414.025 6.987 6.987 0 010 9.85 1 1 0 01-1.414-1.414 4.987 4.987 0 000-7.022 1 1 0 01-.025-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent">
                  RAVR Audio Engine
                </h1>
                <p className="text-xs text-white/60">
                  Professional Audio Workstation
                </p>
              </div>
            </div>
            <button
              onClick={() => setLibOpen(true)}
              className="px-3 py-1 rounded bg-white/10 text-white/80 hover:bg-white/15 transition-colors"
            >
              📁 Library
            </button>
            <div className="hidden sm:flex">
              <TopBarHiFi />
            </div>
          </div>

          <div className="w-full md:w-auto mt-2 md:mt-0">
            <Navigation />
          </div>
        </header>

        <Routes>
          <Route path="/" element={<PlayerView />} />
          <Route path="/dsp" element={<DspView />} />
          <Route
            path="/tracks"
            element={
              <Suspense
                fallback={
                  <div className="text-white">Načítání detekce stop...</div>
                }
              >
                <TrackDetectionPage />
              </Suspense>
            }
          />
          <Route
            path="/ai-models"
            element={
              <Suspense
                fallback={
                  <div className="text-white">Loading AI Models...</div>
                }
              >
                <ModelTestPage />
              </Suspense>
            }
          />
          <Route
            path="/euph-test"
            element={
              <Suspense
                fallback={
                  <div className="text-white">Loading EUPH Codec...</div>
                }
              >
                <EuphTestPage />
              </Suspense>
            }
          />
          <Route
            path="/euph-live"
            element={
              <Suspense
                fallback={
                  <div className="text-white">Loading EUPH Live Processor...</div>
                }
              >
                <EuphLivePage />
              </Suspense>
            }
          />
          <Route path="/settings" element={<SettingsView />} />
        </Routes>

        <div className="fixed bottom-4 right-4 flex gap-3 z-40">
          <button
            onClick={() => setFullscreenViz(!fullscreenViz)}
            className={`p-3 rounded-full transition-all ${
              fullscreenViz
                ? "bg-cyan-600 text-white shadow-lg shadow-cyan-500/50"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
            title="Toggle Fullscreen Visualizer"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 11-2 0V5H5v10h10v-1a1 1 0 112 0v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4z" />
              <path d="M13 8a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 11-2 0V9.414l-4.293 4.293a1 1 0 01-1.414-1.414L14.586 8H13a1 1 0 01-1-1z" />
            </svg>
          </button>
          <button
            onClick={() => setShowAdvanced(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white font-bold rounded-lg shadow-lg transition-all transform hover:scale-105"
          >
            🚀 Advanced Mode
          </button>
        </div>
      </Layout>

      {/* Full NowPlaying player - only on main Player page */}
      {!showCompact && (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-30">
          <div className="max-w-5xl mx-auto">
            <NowPlaying />
          </div>
        </div>
      )}

      <LibraryPanel open={libOpen} onClose={() => setLibOpen(false)} />
      <VisualizerControls />
    </>
  );
}

export default function App() {
  return <AppContent />;
}

function PlayerView() {
  return (
    <div className="space-y-8">
      {/* 🎵 Hlavní hudební zážitek */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-600 bg-clip-text text-transparent mb-4">
          RAVR · Audio Engine
        </h2>
        <p className="text-white/70 text-lg">
          Prostě nahraj hudbu. Uvidíš rozdíl. ✨
        </p>
      </div>

      {/* 🎧 Welcome Audio Demo - OKAMŽITÝ HUDEBNÍ ZÁŽITEK! */}
      <WelcomeAudioDemo />

      {/* 🎛️ Quick Controls */}
      <DspQuick />

      {/* ⚡ Advanced Format Support - subtilně */}
      <div className="text-center">
        <details className="group">
          <summary className="cursor-pointer text-white/60 hover:text-white/80 transition-colors text-sm">
            Advanced Audio Formats →
          </summary>
          <div className="mt-4">
            <EuphFormatTester />
          </div>
        </details>
      </div>
    </div>
  );
}

function DspView() {
  return (
    <div className="space-y-8 pb-8">
      {/* 🔥 WASM DSP Engine - NEW! */}
      <WasmDspControls />

      {/* 🎛️ Professional DSP Controls */}
      <ProfessionalDSP />

      {/* 🎚️ Auto-Mastering with Master Me */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4 text-white">
          🎚️ Auto-Mastering
        </h2>
        <AutoMasterPanel />
      </div>

      {/* 🤖 AI Mastering Suite */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4 text-white">
          🤖 AI Mastering Suite
        </h2>
        <Suspense
          fallback={<div className="text-white">Loading AI Mastering...</div>}
        >
          <AIMasteringPanel />
        </Suspense>
      </div>
    </div>
  );
}

function SettingsView() {
  return React.createElement(SettingsViewComponent);
}
