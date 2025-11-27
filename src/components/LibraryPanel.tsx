import { useCallback, useState, useMemo } from 'react';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { usePlayer } from '@/state/playerStore';
import { useLibrary } from '@/hooks/useLibrary';
import { FiPlay, FiPause, FiFolder, FiMusic, FiSearch, FiTrash2, FiX } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';

interface LibraryPanelProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

export function LibraryPanel({ open, onClose }: LibraryPanelProps) {
  const { tracks, scanProgress, isScanning, addFolder, clearLibrary, getTrackUrl } = useLibrary();
  const { load, toggle, isPlaying } = useAudioEngine();
  const { current, setCurrent } = usePlayer();
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<'none' | 'artist' | 'album'>('artist');

  // Filter tracks based on search
  const filteredTracks = useMemo(() => {
    if (!searchQuery) return tracks;
    const query = searchQuery.toLowerCase();
    return tracks.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.artist?.toLowerCase().includes(query) ||
        t.album?.toLowerCase().includes(query)
    );
  }, [tracks, searchQuery]);

  // Group tracks
  const groupedTracks = useMemo(() => {
    if (groupBy === 'none') {
      return { 'All Tracks': filteredTracks };
    }

    const groups: Record<string, typeof filteredTracks> = {};
    filteredTracks.forEach((track) => {
      const key = groupBy === 'artist' 
        ? (track.artist || 'Unknown Artist')
        : (track.album || 'Unknown Album');
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(track);
    });

    return groups;
  }, [filteredTracks, groupBy]);

  const handleTrackClick = useCallback(async (track: any) => {
    setCurrent(track);
    
    // Get URL for the track (from cache or fetch from handle)
    let url = track.url;
    if (!url) {
      url = await getTrackUrl(track.id);
    }
    
    if (url) {
      load(url);
      toggle();
    } else {
      console.error('Failed to load track:', track.name);
    }
  }, [load, toggle, setCurrent, getTrackUrl]);

  const handleAddFolder = useCallback(() => {
    addFolder();
  }, [addFolder]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose}
      />

      {/* Panel */}
      <aside className="relative w-full max-w-md bg-gradient-to-br from-slate-900/98 via-slate-800/98 to-slate-900/98 backdrop-blur-xl border-r border-white/10 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                <FiMusic className="text-white text-lg" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">Music Library</h2>
                <p className="text-xs text-white/60">{tracks.length} tracks total</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-all"
              aria-label="Close library"
            >
              <FiX size={20} />
            </button>
          </div>

          {/* Auto Scan Button */}
          <button
            onClick={handleAddFolder}
            disabled={isScanning}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold shadow-lg hover:shadow-purple-500/50 transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed"
          >
            {isScanning ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <FiFolder size={18} />
                <HiSparkles size={16} />
                Auto Scan Folder
              </>
            )}
          </button>

          {/* Progress Bar */}
          {isScanning && scanProgress && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs text-white/70">
                <span>Processing...</span>
                <span>{scanProgress.processed}/{scanProgress.total}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-300"
                  style={{ 
                    width: `${(scanProgress.processed / scanProgress.total) * 100}%` 
                  }}
                />
              </div>
              {scanProgress.currentFile && (
                <p className="text-xs text-white/50 truncate">
                  {scanProgress.currentFile}
                </p>
              )}
            </div>
          )}

          {/* Search Bar */}
          <div className="mt-4 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
            <input
              type="text"
              placeholder="Search tracks, artists, albums..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
            />
          </div>

          {/* Group By */}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setGroupBy('none')}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                groupBy === 'none'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setGroupBy('artist')}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                groupBy === 'artist'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              By Artist
            </button>
            <button
              onClick={() => setGroupBy('album')}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                groupBy === 'album'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              By Album
            </button>
          </div>

          {/* Clear Library */}
          {tracks.length > 0 && (
            <button
              onClick={clearLibrary}
              className="mt-3 w-full px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-all flex items-center justify-center gap-2"
            >
              <FiTrash2 size={14} />
              Clear Library
            </button>
          )}
        </div>

        {/* Track List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {Object.keys(groupedTracks).length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                <FiMusic className="text-white/40" size={24} />
              </div>
              <p className="text-white/60 text-sm">No tracks in library</p>
              <p className="text-white/40 text-xs mt-1">Click "Auto Scan Folder" to add music</p>
            </div>
          ) : (
            Object.entries(groupedTracks).map(([groupName, groupTracks]) => (
              <div key={groupName}>
                {groupBy !== 'none' && (
                  <h3 className="text-white/80 font-semibold text-sm mb-2 px-2">
                    {groupName}
                    <span className="text-white/40 text-xs ml-2">({groupTracks.length})</span>
                  </h3>
                )}
                <div className="space-y-1">
                  {groupTracks.map((track) => {
                    const isCurrent = current?.id === track.id;
                    const isCurrentPlaying = isCurrent && isPlaying;
                    
                    return (
                      <button
                        key={track.id}
                        onClick={() => handleTrackClick(track)}
                        className={`group w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                          isCurrent 
                            ? 'bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30' 
                            : 'bg-white/5 hover:bg-white/10 border border-transparent'
                        }`}
                      >
                        {/* Play Button */}
                        <div className={`w-10 h-10 flex-shrink-0 rounded-lg flex items-center justify-center transition-all ${
                          isCurrentPlaying
                            ? 'bg-gradient-to-br from-purple-500 to-cyan-500 text-white shadow-lg'
                            : 'bg-white/10 text-white/70 group-hover:bg-white/20 group-hover:text-white'
                        }`}>
                          {isCurrentPlaying ? (
                            <FiPause size={16} />
                          ) : (
                            <FiPlay size={16} className="ml-0.5" />
                          )}
                        </div>

                        {/* Track Info */}
                        <div className="flex-1 min-w-0 text-left">
                          <div className={`font-medium truncate ${
                            isCurrent ? 'text-white' : 'text-white/90'
                          }`}>
                            {track.name}
                          </div>
                          <div className="text-xs text-white/50 truncate">
                            {track.artist || 'Unknown Artist'}
                            {track.album && ` • ${track.album}`}
                          </div>
                        </div>

                        {/* Duration */}
                        {track.duration && (
                          <div className="text-xs text-white/40 font-mono">
                            {Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, '0')}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
