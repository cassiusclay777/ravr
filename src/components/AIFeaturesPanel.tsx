/**
 * AIFeaturesPanel - AI Playlist Generator & Lyrics Detection
 */

import React, { useState } from 'react';
import { aiPlaylistGenerator, PlaylistCriteria, Track } from '../ai/AIPlaylistGenerator';
import { lyricsDetection, LyricsData } from '../ai/LyricsDetection';

export const AIFeaturesPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'playlist' | 'lyrics'>('playlist');
  const [generatedPlaylist, setGeneratedPlaylist] = useState<Track[]>([]);
  const [lyrics, setLyrics] = useState<LyricsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Playlist generation
  const handleGeneratePlaylist = async () => {
    setIsLoading(true);
    try {
      const criteria: PlaylistCriteria = {
        mood: (document.getElementById('mood-select') as HTMLSelectElement)?.value as any,
        duration: parseInt((document.getElementById('duration-input') as HTMLInputElement)?.value || '3600'),
        diversity: parseFloat((document.getElementById('diversity-input') as HTMLInputElement)?.value || '0.7'),
      };

      const playlist = await aiPlaylistGenerator.generatePlaylist(criteria);
      setGeneratedPlaylist(playlist);
    } catch (error) {
      console.error('Playlist generation failed:', error);
      alert('Failed to generate playlist');
    }
    setIsLoading(false);
  };

  // Lyrics detection
  const handleDetectLyrics = async (file: File) => {
    setIsLoading(true);
    try {
      // This would typically come from the current playing track
      // For now, we'll show how it would work
      alert('Lyrics detection requires audio buffer from playing track. Feature coming soon!');
    } catch (error) {
      console.error('Lyrics detection failed:', error);
      alert('Failed to detect lyrics');
    }
    setIsLoading(false);
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
          <span className="text-2xl">🤖</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">AI-Powered Features</h2>
          <p className="text-sm text-slate-400">Smart playlists & lyrics detection</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-700">
        {['playlist', 'lyrics'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 font-medium capitalize transition-all ${
              activeTab === tab
                ? 'text-pink-400 border-b-2 border-pink-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            {tab === 'playlist' ? '🎵 Playlist Generator' : '🎤 Lyrics Detection'}
          </button>
        ))}
      </div>

      {/* Playlist Tab */}
      {activeTab === 'playlist' && (
        <div className="space-y-6">
          {/* Mood Selection */}
          <div>
            <label className="block text-white font-medium mb-2">Mood</label>
            <select
              id="mood-select"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-pink-500"
            >
              <option value="energetic">⚡ Energetic</option>
              <option value="calm">🌊 Calm</option>
              <option value="happy">😊 Happy</option>
              <option value="sad">😢 Sad</option>
              <option value="focus">🎯 Focus</option>
              <option value="party">🎉 Party</option>
            </select>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-white font-medium mb-2">
              Duration: <span className="text-pink-400" id="duration-display">60</span> minutes
            </label>
            <input
              id="duration-input"
              type="range"
              min={1800}
              max={7200}
              step={600}
              defaultValue={3600}
              onChange={(e) => {
                const minutes = Math.floor(parseInt(e.target.value) / 60);
                document.getElementById('duration-display')!.textContent = minutes.toString();
              }}
              className="w-full accent-pink-500"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>30 min</span>
              <span>120 min</span>
            </div>
          </div>

          {/* Diversity */}
          <div>
            <label className="block text-white font-medium mb-2">
              Diversity: <span className="text-pink-400" id="diversity-display">70</span>%
            </label>
            <input
              id="diversity-input"
              type="range"
              min={0}
              max={1}
              step={0.1}
              defaultValue={0.7}
              onChange={(e) => {
                const percent = Math.floor(parseFloat(e.target.value) * 100);
                document.getElementById('diversity-display')!.textContent = percent.toString();
              }}
              className="w-full accent-pink-500"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>Similar tracks</span>
              <span>Diverse mix</span>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGeneratePlaylist}
            disabled={isLoading}
            className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold rounded-lg transition-all disabled:opacity-50"
          >
            {isLoading ? '⏳ Generating...' : '🎲 Generate Playlist'}
          </button>

          {/* Generated Playlist */}
          {generatedPlaylist.length > 0 && (
            <div className="mt-6">
              <h3 className="text-white font-semibold mb-3">
                Generated Playlist ({generatedPlaylist.length} tracks)
              </h3>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {generatedPlaylist.map((track, index) => (
                  <div
                    key={track.id}
                    className="p-3 bg-slate-700/50 rounded-lg flex items-center gap-3"
                  >
                    <div className="text-slate-400 font-mono text-sm w-8">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium">{track.title}</div>
                      <div className="text-sm text-slate-400">{track.artist}</div>
                    </div>
                    {track.features && (
                      <div className="text-xs text-pink-400 font-mono">
                        {track.features.tempo.toFixed(0)} BPM
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="p-4 bg-pink-500/10 border border-pink-500/30 rounded-lg">
            <div className="text-sm text-pink-300">
              💡 <strong>Tip:</strong> Playlist generator analyzuje BPM, energii, mood a další
              audio charakteristiky pro vytvoření dokonalého mixu.
            </div>
          </div>
        </div>
      )}

      {/* Lyrics Tab */}
      {activeTab === 'lyrics' && (
        <div className="space-y-6">
          {/* Info about Whisper */}
          <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <div className="text-sm text-purple-300">
              <strong>🎤 AI Lyrics Detection</strong>
              <p className="mt-2">
                Používá Whisper AI model pro automatickou transkripci lyrics z audio.
                Podporuje vocal separation pro lepší přesnost.
              </p>
            </div>
          </div>

          {/* Language Selection */}
          <div>
            <label className="block text-white font-medium mb-2">Language</label>
            <select className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500">
              <option value="auto">Auto-detect</option>
              <option value="en">English</option>
              <option value="cs">Czech</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>

          {/* Model Size */}
          <div>
            <label className="block text-white font-medium mb-2">Whisper Model</label>
            <select className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500">
              <option value="tiny">Tiny (Fastest, 39M params)</option>
              <option value="base" selected>Base (Balanced, 74M params)</option>
              <option value="small">Small (Better, 244M params)</option>
              <option value="medium">Medium (Great, 769M params)</option>
              <option value="large">Large (Best, 1550M params)</option>
            </select>
          </div>

          {/* Vocal Separation */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                defaultChecked
                className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-purple-500 focus:ring-purple-500"
              />
              <div>
                <div className="text-white font-medium">Enable Vocal Separation</div>
                <div className="text-sm text-slate-400">Vylepší přesnost izolací vokálů</div>
              </div>
            </label>
          </div>

          {/* Detect Button */}
          <button
            onClick={() => alert('Connect to playing track to detect lyrics')}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold rounded-lg transition-all"
          >
            🎤 Detect Lyrics from Current Track
          </button>

          {/* Lyrics Display */}
          {lyrics && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">Detected Lyrics</h3>
                <button className="text-sm text-purple-400 hover:text-purple-300">
                  Export as LRC
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto p-4 bg-slate-900/50 rounded-lg space-y-3">
                {lyrics.segments.map((segment, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="text-slate-400 font-mono text-sm w-16">
                      {formatTime(segment.start)}
                    </div>
                    <div className="text-white">{segment.text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Requirements */}
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <div className="text-sm text-yellow-300">
              ⚠️ <strong>Poznámka:</strong> Pro použití lyrics detection je nutné nainstalovat
              <code className="mx-1 px-2 py-0.5 bg-slate-900 rounded">@xenova/transformers</code>
              pomocí <code className="mx-1 px-2 py-0.5 bg-slate-900 rounded">pnpm add @xenova/transformers</code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default AIFeaturesPanel;
