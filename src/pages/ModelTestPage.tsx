import React, { useState, useEffect } from 'react';
import { modelDownloader } from '../ai/ModelDownloaderV2';

interface ModelStatus {
  id: string;
  name: string;
  size: number;
  cached: boolean;
  downloading: boolean;
  progress: number;
  speed: number;
  eta: number;
  status: 'idle' | 'downloading' | 'completed' | 'error' | 'verifying';
}

export const ModelTestPage: React.FC = () => {
  const [models, setModels] = useState<ModelStatus[]>([]);
  const [cacheSize, setCacheSize] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      const availableModels = await modelDownloader.getAvailableModels();

      const modelStatuses = await Promise.all(
        availableModels.map(async (model) => ({
          id: model.id,
          name: model.name,
          size: model.size,
          cached: await modelDownloader.isModelCached(model.id),
          downloading: false,
          progress: 0,
          speed: 0,
          eta: 0,
          status: 'idle' as const
        }))
      );

      setModels(modelStatuses);
      updateCacheSize();
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCacheSize = async () => {
    const size = await modelDownloader.getCacheSize();
    setCacheSize(size);
  };

  const handleDownload = async (modelId: string) => {
    setModels(prev => prev.map(m =>
      m.id === modelId
        ? { ...m, downloading: true, status: 'downloading' as const }
        : m
    ));

    try {
      await modelDownloader.downloadModel(modelId, (progress) => {
        setModels(prev => prev.map(m =>
          m.id === modelId
            ? {
                ...m,
                progress: progress.percentage,
                speed: progress.speed,
                eta: progress.eta,
                status: progress.status
              }
            : m
        ));
      });

      // Refresh model status
      const isCached = await modelDownloader.isModelCached(modelId);
      setModels(prev => prev.map(m =>
        m.id === modelId
          ? { ...m, cached: isCached, downloading: false, status: 'completed' as const }
          : m
      ));

      updateCacheSize();
    } catch (error) {
      console.error('Download failed:', error);
      setModels(prev => prev.map(m =>
        m.id === modelId
          ? { ...m, downloading: false, status: 'error' as const }
          : m
      ));
    }
  };

  const handleClearCache = async () => {
    if (!confirm('Clear all cached models? They will need to be re-downloaded.')) {
      return;
    }

    await modelDownloader.clearCache();
    await loadModels();
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return '--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading models...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🤖 AI Model Manager
          </h1>
          <p className="text-gray-300">
            Download and manage AI models for audio processing
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
            <div className="text-gray-400 text-sm mb-1">Total Models</div>
            <div className="text-3xl font-bold text-white">{models.length}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
            <div className="text-gray-400 text-sm mb-1">Cached Models</div>
            <div className="text-3xl font-bold text-green-400">
              {models.filter(m => m.cached).length}
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
            <div className="text-gray-400 text-sm mb-1">Cache Size</div>
            <div className="text-3xl font-bold text-blue-400">
              {formatBytes(cacheSize)}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mb-6 flex gap-4">
          <button
            onClick={() => models.forEach(m => !m.cached && handleDownload(m.id))}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all font-semibold"
          >
            📥 Download All
          </button>
          <button
            onClick={handleClearCache}
            className="px-6 py-3 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all font-semibold border border-red-500/30"
          >
            🗑️ Clear Cache
          </button>
        </div>

        {/* Model List */}
        <div className="space-y-4">
          {models.map(model => (
            <div
              key={model.id}
              className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-white">
                      {model.name}
                    </h3>
                    {model.cached && (
                      <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold border border-green-500/30">
                        ✓ Cached
                      </span>
                    )}
                    {model.status === 'downloading' && (
                      <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-semibold border border-blue-500/30 animate-pulse">
                        ⬇ Downloading
                      </span>
                    )}
                    {model.status === 'verifying' && (
                      <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-semibold border border-yellow-500/30">
                        🔍 Verifying
                      </span>
                    )}
                    {model.status === 'error' && (
                      <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-semibold border border-red-500/30">
                        ✗ Error
                      </span>
                    )}
                  </div>
                  <div className="text-gray-400 text-sm">
                    Size: {formatBytes(model.size)}
                  </div>
                </div>

                {!model.cached && !model.downloading && (
                  <button
                    onClick={() => handleDownload(model.id)}
                    className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all font-semibold"
                  >
                    Download
                  </button>
                )}
              </div>

              {/* Progress Bar */}
              {model.downloading && (
                <div>
                  <div className="w-full bg-gray-700 rounded-full h-3 mb-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                      style={{ width: `${model.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>{model.progress.toFixed(1)}%</span>
                    <span>
                      {formatBytes(model.speed)}/s | ETA: {formatTime(model.eta)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
          <h3 className="text-white font-semibold mb-2">ℹ️ About AI Models</h3>
          <p className="text-gray-300 text-sm">
            These models are used for advanced audio processing features like stem separation,
            super-resolution, genre detection, and auto-mastering. Models are cached in your
            browser's IndexedDB for instant access.
          </p>
        </div>
      </div>
    </div>
  );
};
