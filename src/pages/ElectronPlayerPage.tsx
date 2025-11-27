import React, { useState, useEffect } from 'react';
import { ModernPlayer } from '../components/ModernPlayer';
import WasmDspControls from '../components/WasmDspControls';
import { EuphFormatTester } from '../components/EuphFormatTester';
import { ProfessionalDSP } from '../components/ProfessionalDSP';
import { motion, AnimatePresence } from 'framer-motion';
import { isElectron } from '../utils/electronHelper';

export const ElectronPlayerPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'player' | 'dsp' | 'wasm' | 'euph'>('player');
  const [isElectronApp, setIsElectronApp] = useState(false);

  useEffect(() => {
    setIsElectronApp(isElectron());
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-xl shadow-lg flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.812L4.816 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.816l3.567-2.812a1 1 0 011.617.888zM15.195 7.05a1 1 0 011.414.025 6.987 6.987 0 010 9.85 1 1 0 01-1.414-1.414 4.987 4.987 0 000-7.022 1 1 0 01-.025-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                RAVR Audio Player
              </h1>
              <p className="text-white/60 text-sm">
                {isElectronApp ? '🖥️ Desktop Edition' : '🌐 Web Edition'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center gap-2 mb-8"
        >
          <TabButton
            active={activeTab === 'player'}
            onClick={() => setActiveTab('player')}
            icon="🎵"
            label="Player"
          />
          <TabButton
            active={activeTab === 'dsp'}
            onClick={() => setActiveTab('dsp')}
            icon="🎛️"
            label="DSP"
          />
          <TabButton
            active={activeTab === 'wasm'}
            onClick={() => setActiveTab('wasm')}
            icon="⚡"
            label="WASM"
          />
          <TabButton
            active={activeTab === 'euph'}
            onClick={() => setActiveTab('euph')}
            icon="📦"
            label="EUPH"
          />
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'player' && (
              <div>
                <SectionHeader
                  title="Audio Player"
                  description="Modern player with glassmorphism design"
                  icon="🎵"
                />
                <ModernPlayer />
              </div>
            )}

            {activeTab === 'dsp' && (
              <div className="space-y-6">
                <SectionHeader
                  title="Professional DSP"
                  description="Advanced audio processing effects"
                  icon="🎛️"
                />
                <ProfessionalDSP />
              </div>
            )}

            {activeTab === 'wasm' && (
              <div className="space-y-6">
                <SectionHeader
                  title="WASM DSP Engine"
                  description="High-performance Rust/WASM audio processing"
                  icon="⚡"
                />
                <WasmDspControls />
              </div>
            )}

            {activeTab === 'euph' && (
              <div className="space-y-6">
                <SectionHeader
                  title="EUPH Format"
                  description="Revolutionary audio container format with AI support"
                  icon="📦"
                />
                <EuphFormatTester />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-4 px-6 py-3 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10">
            <StatusIndicator label="Player" status="active" />
            <StatusIndicator label="DSP" status="active" />
            <StatusIndicator label="WASM" status="active" />
            <StatusIndicator label="EUPH" status="active" />
          </div>
        </motion.div>

        {/* Keyboard Shortcuts Hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center text-white/40 text-sm"
        >
          <p>💡 Press <kbd className="px-2 py-1 bg-white/10 rounded">Space</kbd> to play/pause</p>
        </motion.div>
      </div>
    </div>
  );
};

// Tab Button Component
interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, icon, label }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        px-6 py-3 rounded-xl font-medium transition-all
        ${active
          ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg shadow-cyan-500/30'
          : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
        }
      `}
    >
      <span className="text-lg mr-2">{icon}</span>
      {label}
    </motion.button>
  );
};

// Section Header Component
interface SectionHeaderProps {
  title: string;
  description: string;
  icon: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, description, icon }) => {
  return (
    <div className="text-center mb-8">
      <div className="flex items-center justify-center gap-3 mb-3">
        <span className="text-4xl">{icon}</span>
        <div>
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="text-white/60 text-sm">{description}</p>
        </div>
      </div>
    </div>
  );
};

// Status Indicator Component
interface StatusIndicatorProps {
  label: string;
  status: 'active' | 'inactive' | 'warning';
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ label, status }) => {
  const colors = {
    active: 'bg-green-500',
    inactive: 'bg-gray-500',
    warning: 'bg-yellow-500',
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${colors[status]} animate-pulse`} />
      <span className="text-xs text-white/70">{label}</span>
    </div>
  );
};

export default ElectronPlayerPage;
