import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain, Music, Zap, Settings, Download } from 'lucide-react';
import { useAudioStore } from '../../store/audioStore';
import { ProcessingProfile } from '../../types/ai';

interface AiEnhancementPanelProps {
  className?: string;
}

const profileIcons = {
  NeutronAI: <Brain className="w-5 h-5" />,
  IndustrialBeast: <Zap className="w-5 h-5" />,
  AmbientSpace: <Music className="w-5 h-5" />,
  VocalWarmth: <Sparkles className="w-5 h-5" />,
  Flat: <Settings className="w-5 h-5" />
};

const profileDescriptions = {
  NeutronAI: "Balanced AI enhancement with clarity and warmth",
  IndustrialBeast: "Heavy, punchy sound with aggressive processing",
  AmbientSpace: "Expansive, ethereal soundscapes",
  VocalWarmth: "Enhanced vocal presence and warmth",
  Flat: "No AI enhancement - original sound"
};

export const AiEnhancementPanel: React.FC<AiEnhancementPanelProps> = ({ className }) => {
  const { 
    currentTrack, 
    setProcessingProfile,
    isProcessing,
    enhancementMetrics,
    exportToEuph
  } = useAudioStore();

  const [selectedProfile, setSelectedProfile] = useState<ProcessingProfile>('NeutronAI');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [exportProgress, setExportProgress] = useState<number | null>(null);

  const handleProfileSelect = useCallback((profile: ProcessingProfile) => {
    setSelectedProfile(profile);
    setProcessingProfile(profile);
  }, [setProcessingProfile]);

  const handleExport = useCallback(async () => {
    if (!currentTrack) return;
    
    setExportProgress(0);
    try {
      await exportToEuph(currentTrack, {
        profile: selectedProfile,
        quality: 'maximum',
        includeOriginal: true,
        onProgress: (progress) => setExportProgress(progress)
      });
      setExportProgress(null);
    } catch (error) {
      console.error('Export failed:', error);
      setExportProgress(null);
    }
  }, [currentTrack, selectedProfile, exportToEuph]);

  return (
    <motion.div
      className={`bg-gray-900/95 backdrop-blur-xl rounded-2xl p-6 border border-gray-800 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-purple-500" />
          AI Enhancement
        </h2>
        <motion.button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-gray-400 hover:text-white transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Settings className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Processing Profiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {Object.entries(profileIcons).map(([profile, icon]) => (
          <motion.button
            key={profile}
            onClick={() => handleProfileSelect(profile as ProcessingProfile)}
            className={`
              relative p-4 rounded-xl border-2 transition-all
              ${selectedProfile === profile
                ? 'border-purple-500 bg-purple-500/10 text-white'
                : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:text-gray-300'
              }
            `}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex flex-col items-center gap-2">
              {icon}
              <span className="text-sm font-medium">{profile}</span>
            </div>
            {selectedProfile === profile && (
              <motion.div
                className="absolute inset-0 rounded-xl border-2 border-purple-400"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
              />
            )}
          </motion.button>
        ))}
      </div>

      {/* Profile Description */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedProfile}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-6"
        >
          <p className="text-gray-400 text-sm">
            {profileDescriptions[selectedProfile]}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Enhancement Metrics */}
      {isProcessing && enhancementMetrics && (
        <motion.div
          className="bg-gray-800/50 rounded-xl p-4 mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <h3 className="text-sm font-medium text-gray-400 mb-3">Enhancement Metrics</h3>
          <div className="space-y-2">
            <MetricBar label="Clarity" value={enhancementMetrics.clarity} />
            <MetricBar label="Warmth" value={enhancementMetrics.warmth} />
            <MetricBar label="Dynamics" value={enhancementMetrics.dynamics} />
            <MetricBar label="Spatial" value={enhancementMetrics.spatial} />
          </div>
        </motion.div>
      )}

      {/* Advanced Settings */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-800/50 rounded-xl p-4 mb-6"
          >
            <h3 className="text-sm font-medium text-gray-400 mb-3">Advanced Settings</h3>
            <div className="space-y-3">
              <SliderControl
                label="AudioSR Strength"
                value={0.8}
                onChange={() => {}}
              />
              <SliderControl
                label="DDSP Harmonics"
                value={0.6}
                onChange={() => {}}
              />
              <SliderControl
                label="Genre Adaptation"
                value={1.0}
                onChange={() => {}}
              />
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Hardware Acceleration</span>
                <ToggleSwitch enabled={true} onChange={() => {}} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export Button */}
      <motion.button
        onClick={handleExport}
        disabled={!currentTrack || exportProgress !== null}
        className={`
          w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2
          ${currentTrack && exportProgress === null
            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }
        `}
        whileHover={currentTrack && exportProgress === null ? { scale: 1.02 } : {}}
        whileTap={currentTrack && exportProgress === null ? { scale: 0.98 } : {}}
      >
        <Download className="w-5 h-5" />
        {exportProgress !== null
          ? `Exporting... ${Math.round(exportProgress)}%`
          : 'Export as .euph'
        }
      </motion.button>

      {/* Processing Indicator */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-4"
          >
            <div className="flex items-center justify-center gap-2">
              <motion.div
                className="w-2 h-2 bg-purple-500 rounded-full"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <motion.div
                className="w-2 h-2 bg-purple-500 rounded-full"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
              />
              <motion.div
                className="w-2 h-2 bg-purple-500 rounded-full"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
              />
              <span className="text-sm text-gray-400 ml-2">Processing with AI...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

interface MetricBarProps {
  label: string;
  value: number;
}

const MetricBar: React.FC<MetricBarProps> = ({ label, value }) => (
  <div className="flex items-center gap-3">
    <span className="text-xs text-gray-500 w-16">{label}</span>
    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
        initial={{ width: 0 }}
        animate={{ width: `${value * 100}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
    <span className="text-xs text-gray-400 w-8">{Math.round(value * 100)}</span>
  </div>
);

interface SliderControlProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

const SliderControl: React.FC<SliderControlProps> = ({ label, value, onChange }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm text-gray-500">{Math.round(value * 100)}%</span>
    </div>
    <input
      type="range"
      min="0"
      max="100"
      value={value * 100}
      onChange={(e) => onChange(Number(e.target.value) / 100)}
      className="w-full h-1 bg-gray-700 rounded-full appearance-none cursor-pointer"
      style={{
        background: `linear-gradient(to right, rgb(147 51 234) 0%, rgb(147 51 234) ${value * 100}%, rgb(55 65 81) ${value * 100}%, rgb(55 65 81) 100%)`
      }}
    />
  </div>
);

interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ enabled, onChange }) => (
  <button
    onClick={() => onChange(!enabled)}
    className={`
      relative w-12 h-6 rounded-full transition-colors
      ${enabled ? 'bg-purple-600' : 'bg-gray-700'}
    `}
  >
    <motion.div
      className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full"
      animate={{ x: enabled ? 24 : 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    />
  </button>
);
