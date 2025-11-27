import React from 'react';
import MinimalDeck from '../components/MinimalDeck';
import HiddenDev from '../components/HiddenDev';

export const ZeroPage: React.FC = () => {
  return (
    <div className="text-white">
      <div className="glass p-6 rounded-xl mb-8 border border-cyan-500/20 hover:border-cyan-400/30 transition-all duration-300">
        <h1 className="text-3xl font-bold mb-4 text-cyan-300 font-orbitron tracking-wider">Zero UI Deck</h1>
        <p className="text-cyan-400 mb-4 text-sm">
          Minimal 3-button player with automatic device detection and profile-based DSP. Press <span className="font-mono">Shift + D</span> to toggle the hidden developer panel.
        </p>
        <MinimalDeck />
      </div>

      <HiddenDev />
    </div>
  );
};

export default ZeroPage;
