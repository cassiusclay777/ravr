import React from 'react';
import { Link } from 'react-router-dom';

const About = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto bg-gray-800 rounded-xl p-8 shadow-2xl">
        <Link 
          to="/" 
          className="inline-flex items-center text-purple-400 hover:text-purple-300 mb-8 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Player
        </Link>
        
        <div className="prose prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-6 flex items-center">
            <span className="text-purple-400 mr-3">🔊</span>
            RAVR v1.3 – Realtime Audio Engine
          </h1>
          
          <p className="text-xl text-gray-300 mb-8">
            <strong>Vyladěno pro Patrika. Hraje. Vizualizuje. Reaguje.</strong>
          </p>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="space-y-6">
              <div className="p-6 bg-gray-700/50 rounded-xl">
                <h2 className="text-2xl font-semibold mb-4 text-purple-300">🎛️ DSP Engine</h2>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="text-purple-400 mr-2">•</span>
                    <span>3-Band EQ s plynulým rampováním</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-400 mr-2">•</span>
                    <span>Kompletní DSP Chain: Gain → Compressor → Limiter</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-400 mr-2">•</span>
                    <span>Realtime FFT vizualizace</span>
                  </li>
                </ul>
              </div>
              
              <div className="p-6 bg-gray-700/50 rounded-xl">
                <h2 className="text-2xl font-semibold mb-4 text-purple-300">🎵 Presety</h2>
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <span className="w-3 h-3 rounded-full bg-purple-500 mr-2"></span>
                    <span>Flat: Neutrální zvuk</span>
                  </li>
                  <li className="flex items-center">
                    <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                    <span>Neutron: Výrazné basy a výšky</span>
                  </li>
                  <li className="flex items-center">
                    <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                    <span>Ambient: Prodloužené doznívání</span>
                  </li>
                  <li className="flex items-center">
                    <span className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></span>
                    <span>Voice: Optimalizováno pro mluvené slovo</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="p-6 bg-gray-700/50 rounded-xl">
                <h2 className="text-2xl font-semibold mb-4 text-purple-300">🎨 Vizuály</h2>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="text-purple-400 mr-2">•</span>
                    <span>Realtime spektrální analýza</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-400 mr-2">•</span>
                    <span>Plná podpora režimu celé obrazovky</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-400 mr-2">•</span>
                    <span>Responzivní design</span>
                  </li>
                </ul>
              </div>
              
              <div className="p-6 bg-gray-700/50 rounded-xl">
                <h2 className="text-2xl font-semibold mb-4 text-purple-300">⚡ Výkon</h2>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="text-purple-400 mr-2">•</span>
                    <span>Optimalizované pro nízkou latenci</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-400 mr-2">•</span>
                    <span>Minimalistické rozhraní s nízkou režií</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-400 mr-2">•</span>
                    <span>Automatická správa paměti</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-gray-700">
            <h2 className="text-2xl font-semibold mb-4">O projektu RAVR</h2>
            <p className="text-gray-300 mb-6">
              RAVR je čistý zvukový engine – bez rušení, bez zbytečností. Navrženo jako undergroundová DSP mašina pro čistý poslech i live testy na studiových monitorech a VoiceMeeter výstupech.
            </p>
            <p className="text-gray-400 text-sm">
              Verze 1.3 | 18. 7. 2025 | Vytvořeno s ❤️ pro Patrika
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
