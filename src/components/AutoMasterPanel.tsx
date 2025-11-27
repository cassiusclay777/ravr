import React, { useState, useEffect } from "react";
import {
  FiZap,
  FiDownload,
  FiInfo,
  FiCheckCircle,
  FiAlertCircle,
  FiLoader,
} from "react-icons/fi";
import {
  autoMasterService,
  AutoMasterOptions,
  ProcessingProgress,
} from "../api/autoMasterApi";

interface AutoMasterPanelProps {
  onProcessedAudio?: (audioBuffer: ArrayBuffer) => void;
  currentAudioBuffer?: ArrayBuffer;
}

export const AutoMasterPanel: React.FC<AutoMasterPanelProps> = ({
  onProcessedAudio,
  currentAudioBuffer,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);
  const [isPluginAvailable, setIsPluginAvailable] = useState<boolean | null>(
    null
  );
  const [showInstructions, setShowInstructions] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    processedAudio?: ArrayBuffer;
    processingTime?: number;
    originalLufs?: number;
    finalLufs?: number;
    originalTruePeak?: number;
    finalTruePeak?: number;
    error?: string;
  } | null>(null);

  // Auto-mastering options
  const [options, setOptions] = useState<AutoMasterOptions>({
    targetLUFS: -14,
    maxTruePeak: -1.0,
    inputGain: 0,
    outputGain: 0,
  });

  useEffect(() => {
    // Check if master_me plugin is available
    const checkPluginAvailability = async () => {
      const available = await autoMasterService.isMasterMeAvailable();
      setIsPluginAvailable(available);
    };

    checkPluginAvailability();
  }, []);

  const handleAutoMaster = async () => {
    if (!currentAudioBuffer) {
      alert(
        "Žádný audio soubor není načten. Prosím nahrajte audio soubor před auto-masteringem."
      );
      return;
    }

    if (!isPluginAvailable) {
      setShowInstructions(true);
      return;
    }

    setIsProcessing(true);
    setProgress(null);
    setLastResult(null);

    try {
      const result = await autoMasterService.autoMaster(
        {
          audioData: currentAudioBuffer,
          options,
        },
        (progressUpdate) => {
          setProgress(progressUpdate);
        }
      );

      setLastResult(result);

      if (result.success && result.processedAudio && onProcessedAudio) {
        onProcessedAudio(result.processedAudio);
      }
    } catch (error) {
      console.error("Auto-mastering failed:", error);
      setLastResult({
        success: false,
        error: error instanceof Error ? error.message : "Neznámá chyba",
      });
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  const downloadProcessedAudio = () => {
    if (lastResult?.success && lastResult.processedAudio) {
      const blob = new Blob([lastResult.processedAudio], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "auto-mastered.wav";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const formatTime = (ms?: number) => {
    if (!ms) return "N/A";
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatLUFS = (lufs?: number) => {
    if (lufs === undefined) return "N/A";
    return `${lufs.toFixed(1)} LUFS`;
  };

  const formatTruePeak = (tp?: number) => {
    if (tp === undefined) return "N/A";
    return `${tp.toFixed(1)} dBTP`;
  };

  if (isPluginAvailable === null) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <FiLoader className="text-cyan-400 text-xl animate-spin" />
          <h3 className="text-xl font-bold text-white">Auto-Mastering</h3>
        </div>
        <p className="text-white/60">
          Kontroluji dostupnost Master Me pluginu...
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg flex items-center justify-center">
            <FiZap className="text-white text-xl" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Auto-Mastering</h3>
            <p className="text-xs text-white/60">
              {isPluginAvailable
                ? "Master Me plugin je k dispozici"
                : "Master Me plugin není nalezen"}
            </p>
          </div>
        </div>

        {!isPluginAvailable && (
          <button
            onClick={() => setShowInstructions(true)}
            className="p-2 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors"
            title="Zobrazit instrukce k instalaci"
          >
            <FiInfo className="text-lg" />
          </button>
        )}
      </div>

      {/* Plugin Status */}
      {!isPluginAvailable && (
        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <div className="flex items-start gap-3">
            <FiAlertCircle className="text-orange-400 text-lg mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-orange-400 mb-2">
                Master Me plugin není nalezen
              </h4>
              <p className="text-orange-300/80 text-sm mb-3">
                Pro použití auto-masteringu je potřeba nainstalovat Master Me
                plugin.
              </p>
              <button
                onClick={() => setShowInstructions(true)}
                className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-colors text-sm"
              >
                Zobrazit instrukce k instalaci
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Mastering Options */}
      {isPluginAvailable && (
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-white">Nastavení</h4>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/70 mb-2">
                Target LUFS
              </label>
              <input
                type="number"
                value={options.targetLUFS}
                onChange={(e) =>
                  setOptions((prev) => ({
                    ...prev,
                    targetLUFS: Number(e.target.value),
                  }))
                }
                min="-23"
                max="-9"
                step="0.1"
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">
                Max True Peak
              </label>
              <input
                type="number"
                value={options.maxTruePeak}
                onChange={(e) =>
                  setOptions((prev) => ({
                    ...prev,
                    maxTruePeak: Number(e.target.value),
                  }))
                }
                min="-3"
                max="0"
                step="0.1"
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">
                Input Gain
              </label>
              <input
                type="number"
                value={options.inputGain}
                onChange={(e) =>
                  setOptions((prev) => ({
                    ...prev,
                    inputGain: Number(e.target.value),
                  }))
                }
                min="-12"
                max="12"
                step="0.1"
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">
                Output Gain
              </label>
              <input
                type="number"
                value={options.outputGain}
                onChange={(e) =>
                  setOptions((prev) => ({
                    ...prev,
                    outputGain: Number(e.target.value),
                  }))
                }
                min="-12"
                max="12"
                step="0.1"
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>
        </div>
      )}

      {/* Auto-Master Button */}
      {isPluginAvailable && (
        <button
          onClick={handleAutoMaster}
          disabled={isProcessing || !currentAudioBuffer}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition-all transform ${
            isProcessing || !currentAudioBuffer
              ? "bg-gray-600 text-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-purple-500/25 hover:scale-105 active:scale-95"
          }`}
        >
          {isProcessing ? (
            <div className="flex items-center justify-center gap-3">
              <FiLoader className="text-xl animate-spin" />
              <span>Auto-masterování...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3">
              <FiZap className="text-xl" />
              <span>Auto-masterovat</span>
            </div>
          )}
        </button>
      )}

      {/* Progress */}
      {progress && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/70">{progress.message}</span>
            <span className="text-white/50">{progress.progress}%</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Results */}
      {lastResult && (
        <div
          className={`p-4 rounded-xl border ${
            lastResult.success
              ? "bg-green-500/10 border-green-500/20"
              : "bg-red-500/10 border-red-500/20"
          }`}
        >
          <div className="flex items-start gap-3">
            {lastResult.success ? (
              <FiCheckCircle className="text-green-400 text-lg mt-0.5 flex-shrink-0" />
            ) : (
              <FiAlertCircle className="text-red-400 text-lg mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
              <h4
                className={`font-semibold mb-2 ${
                  lastResult.success ? "text-green-400" : "text-red-400"
                }`}
              >
                {lastResult.success
                  ? "Auto-mastering dokončen!"
                  : "Auto-mastering selhal"}
              </h4>

              {lastResult.success ? (
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-white/60">Čas zpracování: </span>
                      <span className="text-white">
                        {formatTime(lastResult.processingTime)}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/60">LUFS: </span>
                      <span className="text-white">
                        {formatLUFS(lastResult.originalLufs)} →{" "}
                        {formatLUFS(lastResult.finalLufs)}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/60">True Peak: </span>
                      <span className="text-white">
                        {formatTruePeak(lastResult.originalTruePeak)} →{" "}
                        {formatTruePeak(lastResult.finalTruePeak)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={downloadProcessedAudio}
                    className="mt-3 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors flex items-center gap-2"
                  >
                    <FiDownload className="text-sm" />
                    Stáhnout zpracovaný audio
                  </button>
                </div>
              ) : (
                <p className="text-red-300/80 text-sm">{lastResult.error}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Installation Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">
                Instalace Master Me pluginu
              </h3>
              <button
                onClick={() => setShowInstructions(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-white/80">
              <pre className="whitespace-pre-wrap text-sm bg-slate-900/50 p-4 rounded-lg">
                {autoMasterService.getInstallationInstructions()}
              </pre>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowInstructions(false)}
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
              >
                Rozumím
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
