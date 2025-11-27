import React, { useCallback, useRef } from 'react';
import { TrackInfo } from '../../hooks/useMultitrack';
import { FiVolume2, FiVolumeX, FiMic, FiTrash2, FiPlus } from 'react-icons/fi';

interface TrackListProps {
  tracks: TrackInfo[];
  activeTrackId: string | null;
  onTrackSelect: (trackId: string) => void;
  onTrackMute: (trackId: string, isMuted: boolean) => void;
  onTrackSolo: (trackId: string, isSoloed: boolean) => void;
  onTrackRemove: (trackId: string) => void;
  onTrackAdd: () => void;
}

const TrackList: React.FC<TrackListProps> = ({
  tracks,
  activeTrackId,
  onTrackSelect,
  onTrackMute,
  onTrackSolo,
  onTrackRemove,
  onTrackAdd,
}) => {
  const handleDragStart = useCallback((e: React.DragEvent, trackId: string) => {
    e.dataTransfer.setData('trackId', trackId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetTrackId: string) => {
    e.preventDefault();
    const sourceTrackId = e.dataTransfer.getData('trackId');
    if (sourceTrackId && sourceTrackId !== targetTrackId) {
      // Reorder logic would go here
      console.log(`Move ${sourceTrackId} to position of ${targetTrackId}`);
    }
  }, []);

  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-gray-400">
        <p>No tracks yet. Add your first track to get started.</p>
        <button
          onClick={onTrackAdd}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Track
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tracks.map((track) => (
        <div
          key={track.id}
          draggable
          onDragStart={(e) => handleDragStart(e, track.id)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, track.id)}
          className={`p-3 rounded-lg transition-colors ${
            activeTrackId === track.id
              ? 'bg-blue-900/30 border-l-4 border-blue-500'
              : 'bg-gray-800/50 hover:bg-gray-700/50'
          }`}
          onClick={() => onTrackSelect(track.id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div 
                className="w-4 h-4 rounded-full flex-shrink-0" 
                style={{ backgroundColor: track.color || '#3b82f6' }}
              />
              <div className="truncate flex-1">
                <p className="font-medium truncate">{track.name}</p>
                <p className="text-xs text-gray-400">
                  {track.isSoloed ? 'Soloed' : track.isMuted ? 'Muted' : ''}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTrackSolo(track.id, !track.isSoloed);
                }}
                className={`p-1.5 rounded ${
                  track.isSoloed
                    ? 'bg-yellow-600/30 text-yellow-400'
                    : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
                }`}
                title={track.isSoloed ? 'Unsolo track' : 'Solo track'}
              >
                <FiMic
                  className={`w-4 h-4 ${track.isSoloed ? 'text-yellow-400' : 'text-gray-400'}`}
                />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTrackMute(track.id, !track.isMuted);
                }}
                className={`p-1.5 rounded ${
                  track.isMuted
                    ? 'bg-red-600/30 text-red-400'
                    : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
                }`}
                title={track.isMuted ? 'Unmute track' : 'Mute track'}
              >
                {track.isMuted ? (
                  <FiVolumeX className="w-4 h-4" />
                ) : (
                  <FiVolume2 className="w-4 h-4" />
                )}
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (tracks.length > 1) {
                    onTrackRemove(track.id);
                  }
                }}
                className="p-1.5 rounded text-gray-400 hover:bg-red-600/30 hover:text-red-400 disabled:opacity-30"
                disabled={tracks.length <= 1}
                title="Remove track"
              >
                <FiTrash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="mt-2">
            <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${track.volume * 100}%` }}
              />
            </div>
            <div className="text-xs text-right mt-1 text-gray-400">
              {Math.round(track.volume * 100)}%
            </div>
          </div>
        </div>
      ))}
      
      <button
        onClick={onTrackAdd}
        className="w-full mt-2 p-2 flex items-center justify-center space-x-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded-lg transition-colors"
      >
        <FiPlus className="w-4 h-4" />
        <span>Add Track</span>
      </button>
    </div>
  );
};

export default TrackList;
