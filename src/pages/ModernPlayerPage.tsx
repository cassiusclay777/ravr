import React from 'react';
import { ModernPlayer } from '../components/ModernPlayer';
import { motion } from 'framer-motion';

export const ModernPlayerPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-4">
            RAVR Audio Player
          </h1>
          <p className="text-white/70 text-lg">
            Modern Audio Experience with Glassmorphism Design
          </p>
        </motion.div>

        {/* Modern Player */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <ModernPlayer />
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12"
        >
          <FeatureCard
            icon="🎵"
            title="Multi-Format Support"
            description="Play MP3, WAV, FLAC, M4A, OGG, and more"
          />
          <FeatureCard
            icon="🎛️"
            title="Advanced DSP"
            description="Professional EQ, compressor, and effects"
          />
          <FeatureCard
            icon="📊"
            title="Real-time Visualization"
            description="Beautiful audio spectrum and waveform display"
          />
          <FeatureCard
            icon="🎨"
            title="Glassmorphism UI"
            description="Modern, elegant interface design"
          />
          <FeatureCard
            icon="📱"
            title="Responsive Design"
            description="Works perfectly on any screen size"
          />
          <FeatureCard
            icon="⚡"
            title="High Performance"
            description="Optimized for smooth audio playback"
          />
        </motion.div>

        {/* Quick Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12 p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10"
        >
          <h3 className="text-xl font-bold text-white mb-4">Quick Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white/70">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <h4 className="font-semibold text-white mb-1">Drag & Drop</h4>
                <p className="text-sm">Drag audio files directly into the playlist area</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">⌨️</span>
              <div>
                <h4 className="font-semibold text-white mb-1">Keyboard Shortcuts</h4>
                <p className="text-sm">Space to play/pause, Arrow keys to seek</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🎚️</span>
              <div>
                <h4 className="font-semibold text-white mb-1">DSP Effects</h4>
                <p className="text-sm">Click the settings icon to adjust EQ and effects</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔄</span>
              <div>
                <h4 className="font-semibold text-white mb-1">Playlist Management</h4>
                <p className="text-sm">Reorder tracks by dragging, remove with trash icon</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 text-center text-white/50 text-sm"
        >
          <p>Made with ❤️ by the RAVR Team</p>
          <p className="mt-2">
            © 2025 RAVR Audio Player. All rights reserved.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -5 }}
      className="p-6 rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all cursor-pointer"
    >
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-white/60">{description}</p>
    </motion.div>
  );
};

export default ModernPlayerPage;
