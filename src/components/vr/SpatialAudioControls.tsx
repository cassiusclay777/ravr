import React, { useState } from 'react';

interface Vector3D {
  x: number;
  y: number;
  z: number;
}

interface AudioSource {
  id: string;
  name: string;
  position: Vector3D;
  directivity: number;
  distance: number;
  attenuation: 'linear' | 'exponential' | 'inverse';
  dopplerFactor: number;
  roomReflections: boolean;
}

interface SpatialAudioControlsProps {
  sources: AudioSource[];
  listenerPosition: Vector3D;
  onSourceUpdate: (sourceId: string, updates: Partial<AudioSource>) => void;
  onListenerUpdate: (position: Vector3D) => void;
  onAddSource: (name: string) => void;
  onRemoveSource: (sourceId: string) => void;
}

export function SpatialAudioControls({
  sources,
  listenerPosition,
  onSourceUpdate,
  onListenerUpdate,
  onAddSource,
  onRemoveSource,
}: SpatialAudioControlsProps) {
  const [selectedSource, setSelectedSource] = useState<string | null>(
    sources[0]?.id || null
  );
  const [newSourceName, setNewSourceName] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);

  const selectedSourceData = sources.find((s) => s.id === selectedSource);

  const handlePositionChange = (axis: 'x' | 'y' | 'z', value: number) => {
    if (!selectedSource) return;
    const source = sources.find((s) => s.id === selectedSource);
    if (!source) return;

    onSourceUpdate(selectedSource, {
      position: { ...source.position, [axis]: value },
    });
  };

  const handleListenerPositionChange = (axis: 'x' | 'y' | 'z', value: number) => {
    onListenerUpdate({ ...listenerPosition, [axis]: value });
  };

  const formatDistance = (source: AudioSource): number => {
    const dx = source.position.x - listenerPosition.x;
    const dy = source.position.y - listenerPosition.y;
    const dz = source.position.z - listenerPosition.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  };

  return (
    <div className="spatial-audio-controls bg-gray-900 text-white rounded-lg p-6 border border-gray-700">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <span>🎧</span> Spatial Audio Controls
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Position audio sources in 3D space
        </p>
      </div>

      {/* Listener Position */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span>👤</span> Listener Position
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {['x', 'y', 'z'].map((axis) => (
            <div key={axis}>
              <label className="text-xs text-gray-400 block mb-1">
                {axis.toUpperCase()} Axis
              </label>
              <input
                type="range"
                min="-10"
                max="10"
                step="0.1"
                value={listenerPosition[axis as keyof Vector3D]}
                onChange={(e) =>
                  handleListenerPositionChange(
                    axis as 'x' | 'y' | 'z',
                    parseFloat(e.target.value)
                  )
                }
                className="w-full"
              />
              <div className="text-xs text-center text-gray-500 mt-1">
                {listenerPosition[axis as keyof Vector3D].toFixed(1)}m
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Source List */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span>🔊</span> Audio Sources ({sources.length})
          </h3>
          <button
            onClick={() => setShowAddDialog(!showAddDialog)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-semibold transition-colors"
          >
            ➕ Add Source
          </button>
        </div>

        {/* Add Source Dialog */}
        {showAddDialog && (
          <div className="bg-gray-800 rounded-lg p-4 mb-3 border border-green-500/30">
            <input
              type="text"
              placeholder="Source name..."
              value={newSourceName}
              onChange={(e) => setNewSourceName(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 mb-3"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && newSourceName) {
                  onAddSource(newSourceName);
                  setNewSourceName('');
                  setShowAddDialog(false);
                }
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (newSourceName) {
                    onAddSource(newSourceName);
                    setNewSourceName('');
                    setShowAddDialog(false);
                  }
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded-lg text-sm font-semibold"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowAddDialog(false);
                  setNewSourceName('');
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded-lg text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Source Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {sources.map((source) => (
            <button
              key={source.id}
              onClick={() => setSelectedSource(source.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                selectedSource === source.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {source.name}
            </button>
          ))}
        </div>

        {/* Selected Source Controls */}
        {selectedSourceData && (
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-lg">{selectedSourceData.name}</h4>
              <button
                onClick={() => onRemoveSource(selectedSource!)}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs font-semibold transition-colors"
              >
                🗑️ Remove
              </button>
            </div>

            {/* Distance Display */}
            <div className="bg-blue-900/20 rounded-lg p-3 mb-4">
              <div className="text-sm text-gray-400">Distance from listener</div>
              <div className="text-2xl font-bold text-blue-400">
                {formatDistance(selectedSourceData).toFixed(2)}m
              </div>
            </div>

            {/* 3D Position */}
            <div className="mb-4">
              <label className="text-sm font-semibold block mb-2">
                Position (XYZ)
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['x', 'y', 'z'] as const).map((axis) => (
                  <div key={axis}>
                    <label className="text-xs text-gray-400 block mb-1">
                      {axis.toUpperCase()}
                    </label>
                    <input
                      type="range"
                      min="-10"
                      max="10"
                      step="0.1"
                      value={selectedSourceData.position[axis]}
                      onChange={(e) =>
                        handlePositionChange(axis, parseFloat(e.target.value))
                      }
                      className="w-full"
                    />
                    <div className="text-xs text-center text-gray-500 mt-1">
                      {selectedSourceData.position[axis].toFixed(1)}m
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Directivity */}
            <div className="mb-4">
              <label className="text-sm font-semibold block mb-2">
                Directivity
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={selectedSourceData.directivity}
                onChange={(e) =>
                  onSourceUpdate(selectedSource!, {
                    directivity: parseFloat(e.target.value),
                  })
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Omnidirectional (0)</span>
                <span className="font-bold">
                  {selectedSourceData.directivity.toFixed(2)}
                </span>
                <span>Focused (1)</span>
              </div>
            </div>

            {/* Attenuation Model */}
            <div className="mb-4">
              <label className="text-sm font-semibold block mb-2">
                Distance Attenuation
              </label>
              <select
                value={selectedSourceData.attenuation}
                onChange={(e) =>
                  onSourceUpdate(selectedSource!, {
                    attenuation: e.target.value as any,
                  })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
              >
                <option value="linear">Linear (gentle falloff)</option>
                <option value="inverse">Inverse (realistic)</option>
                <option value="exponential">Exponential (rapid falloff)</option>
              </select>
            </div>

            {/* Doppler Factor */}
            <div className="mb-4">
              <label className="text-sm font-semibold block mb-2">
                Doppler Effect
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={selectedSourceData.dopplerFactor}
                onChange={(e) =>
                  onSourceUpdate(selectedSource!, {
                    dopplerFactor: parseFloat(e.target.value),
                  })
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Off (0)</span>
                <span className="font-bold">
                  {selectedSourceData.dopplerFactor.toFixed(1)}x
                </span>
                <span>Exaggerated (2)</span>
              </div>
            </div>

            {/* Room Reflections Toggle */}
            <div className="flex items-center justify-between bg-gray-700 rounded-lg p-3">
              <label className="text-sm font-semibold">Room Reflections</label>
              <input
                type="checkbox"
                checked={selectedSourceData.roomReflections}
                onChange={(e) =>
                  onSourceUpdate(selectedSource!, {
                    roomReflections: e.target.checked,
                  })
                }
                className="w-5 h-5"
              />
            </div>
          </div>
        )}

        {sources.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🔇</div>
            <p>No audio sources yet</p>
            <p className="text-sm">Click "Add Source" to get started</p>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 text-sm">
        <p className="text-purple-300">
          <strong>💡 Tip:</strong> Position sources around the listener to create
          immersive 3D audio. Use directivity for focused sounds like speakers, and
          enable room reflections for realistic acoustics.
        </p>
      </div>
    </div>
  );
}

export default SpatialAudioControls;
