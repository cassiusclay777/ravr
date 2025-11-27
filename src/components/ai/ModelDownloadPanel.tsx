import React, { useEffect, useState } from 'react';
import { ModelDownloader } from '../../ai/ModelDownloader';

interface ModelStatus {
  name: string;
  size: number;
  downloaded: boolean;
  downloading: boolean;
  progress: number;
  speed: number;
  eta: number;
  error?: string;
}

export function ModelDownloadPanel() {
  const [downloader] = useState(() => new ModelDownloader());
  const [models, setModels] = useState<ModelStatus[]>([]);
  const [storageInfo, setStorageInfo] = useState({ used: 0, available: 0 });
  const [downloadingAll, setDownloadingAll] = useState(false);

  useEffect(() => {
    loadModels();
    loadStorageInfo();
  }, []);

  const loadModels = async () => {
    const modelList = await downloader.getModelList();
    setModels(
      modelList.map((m) => ({
        name: m.name,
        size: m.size,
        downloaded: m.downloaded,
        downloading: false,
        progress: 0,
        speed: 0,
        eta: 0,
      }))
    );
  };

  const loadStorageInfo = async () => {
    const storage = await downloader.getStorageUsage();
    setStorageInfo(storage);
  };

  const handleDownloadModel = async (modelName: string, index: number) => {
    // Update state: mark as downloading
    setModels((prev) =>
      prev.map((m, i) =>
        i === index ? { ...m, downloading: true, progress: 0, error: undefined } : m
      )
    );

    try {
      // Convert display name to model id (lowercase, no spaces)
      const modelId = modelName.toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, '');

      await downloader.downloadModel(modelId, (progress) => {
        setModels((prev) =>
          prev.map((m, i) =>
            i === index
              ? {
                  ...m,
                  progress: progress.percentage,
                  speed: progress.speed,
                  eta: progress.eta,
                }
              : m
          )
        );
      });

      // Download complete
      setModels((prev) =>
        prev.map((m, i) =>
          i === index
            ? { ...m, downloading: false, downloaded: true, progress: 100 }
            : m
        )
      );

      loadStorageInfo();
    } catch (error: any) {
      setModels((prev) =>
        prev.map((m, i) =>
          i === index
            ? { ...m, downloading: false, error: error.message }
            : m
        )
      );
    }
  };

  const handleCancelDownload = (modelName: string, index: number) => {
    const modelId = modelName.toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, '');
    downloader.cancelDownload(modelId);

    setModels((prev) =>
      prev.map((m, i) =>
        i === index ? { ...m, downloading: false, progress: 0 } : m
      )
    );
  };

  const handleDownloadAll = async () => {
    setDownloadingAll(true);

    try {
      await downloader.downloadAllModels((modelName, progress) => {
        setModels((prev) =>
          prev.map((m) =>
            m.name.toLowerCase().includes(modelName)
              ? {
                  ...m,
                  downloading: true,
                  progress: progress.percentage,
                  speed: progress.speed,
                  eta: progress.eta,
                }
              : m
          )
        );
      });

      // All downloads complete
      await loadModels();
      await loadStorageInfo();
    } catch (error) {
      console.error('Failed to download all models:', error);
    } finally {
      setDownloadingAll(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    return `${formatBytes(bytesPerSecond)}/s`;
  };

  const totalDownloaded = models.filter((m) => m.downloaded).length;
  const totalModels = models.length;
  const storageUsedPercent =
    storageInfo.available > 0
      ? (storageInfo.used / storageInfo.available) * 100
      : 0;

  return (
    <div className="model-download-panel bg-gray-900 text-white rounded-lg p-6 border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span>🤖</span> AI Model Library
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Download AI models for advanced audio processing
          </p>
        </div>

        <button
          onClick={handleDownloadAll}
          disabled={downloadingAll || totalDownloaded === totalModels}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            downloadingAll || totalDownloaded === totalModels
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
          }`}
        >
          {downloadingAll ? (
            <>
              <span className="inline-block animate-spin mr-2">⏳</span>
              Downloading...
            </>
          ) : totalDownloaded === totalModels ? (
            '✅ All Downloaded'
          ) : (
            `⬇️ Download All (${totalModels - totalDownloaded} remaining)`
          )}
        </button>
      </div>

      {/* Storage Info */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Storage Usage</span>
          <span className="text-sm font-mono">
            {formatBytes(storageInfo.used)} / {formatBytes(storageInfo.available)}
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              storageUsedPercent > 80
                ? 'bg-red-500'
                : storageUsedPercent > 50
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(storageUsedPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Progress Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-blue-400">{totalDownloaded}</div>
          <div className="text-xs text-gray-400 mt-1">Downloaded</div>
        </div>
        <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-purple-400">{totalModels}</div>
          <div className="text-xs text-gray-400 mt-1">Total Models</div>
        </div>
        <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-green-400">
            {totalModels > 0 ? Math.round((totalDownloaded / totalModels) * 100) : 0}%
          </div>
          <div className="text-xs text-gray-400 mt-1">Complete</div>
        </div>
      </div>

      {/* Model List */}
      <div className="space-y-4">
        {models.map((model, index) => (
          <div
            key={model.name}
            className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  {model.downloaded ? '✅' : model.downloading ? '⏳' : '📦'}{' '}
                  {model.name}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Size: {formatBytes(model.size)}
                </p>
              </div>

              {/* Action Button */}
              {model.downloaded ? (
                <span className="px-4 py-2 bg-green-900/30 text-green-400 rounded-lg text-sm font-semibold">
                  Installed
                </span>
              ) : model.downloading ? (
                <button
                  onClick={() => handleCancelDownload(model.name, index)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
              ) : (
                <button
                  onClick={() => handleDownloadModel(model.name, index)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  Download
                </button>
              )}
            </div>

            {/* Progress Bar */}
            {model.downloading && (
              <div className="space-y-2">
                <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-3 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ width: `${model.progress}%` }}
                  >
                    {model.progress > 20 && `${Math.round(model.progress)}%`}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>
                    Speed: {model.speed > 0 ? formatSpeed(model.speed) : '---'}
                  </span>
                  <span>
                    ETA: {model.eta > 0 ? formatTime(model.eta) : 'calculating...'}
                  </span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {model.error && (
              <div className="mt-3 bg-red-900/30 border border-red-500/50 rounded-lg p-3 text-sm text-red-300">
                ❌ {model.error}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Info Note */}
      <div className="mt-6 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 text-sm text-blue-200">
        <p className="font-semibold mb-2">ℹ️ About AI Models</p>
        <ul className="space-y-1 text-xs text-blue-300/80 ml-4">
          <li>• Models are cached locally for offline use</li>
          <li>• Download sizes range from 8MB to 319MB</li>
          <li>• Processing requires sufficient RAM (see individual model requirements)</li>
          <li>• Models are open-source and freely available</li>
        </ul>
      </div>
    </div>
  );
}

export default ModelDownloadPanel;
