import React, { useState } from 'react';
import { ProcessingQueue, ProcessingJob } from '../../ai/ProcessingQueue';

interface PipelineNode {
  id: string;
  type: 'demucs' | 'audiosr' | 'ddsp' | 'style_transfer' | 'genre_detection' | 'auto_mastering';
  name: string;
  icon: string;
  description: string;
  params: Record<string, any>;
  enabled: boolean;
}

interface PresetPipeline {
  id: string;
  name: string;
  description: string;
  icon: string;
  nodes: Omit<PipelineNode, 'id' | 'enabled'>[];
}

const PRESET_PIPELINES: PresetPipeline[] = [
  {
    id: 'vocal-enhancer',
    name: 'Vocal Enhancer',
    description: 'Isolate and enhance vocal quality with AI upsampling',
    icon: '🎤',
    nodes: [
      {
        type: 'audiosr',
        name: 'Audio Super Resolution',
        icon: '⬆️',
        description: '2x upsampling for clarity',
        params: { upsampleFactor: 2, enhancementLevel: 'medium' },
      },
      {
        type: 'demucs',
        name: 'Demucs Stem Separator',
        icon: '🎵',
        description: 'Isolate vocals from mix',
        params: { stem: 'vocals', quality: 'high' },
      },
      {
        type: 'auto_mastering',
        name: 'Auto Mastering',
        icon: '✨',
        description: 'Apply vocal preset mastering',
        params: { preset: 'vocal', loudness: -14 },
      },
    ],
  },
  {
    id: 'remix-builder',
    name: 'Remix Builder',
    description: 'Separate stems and transform each with different timbres',
    icon: '🎛️',
    nodes: [
      {
        type: 'demucs',
        name: 'Stem Separation',
        icon: '🎵',
        description: 'Extract all 4 stems',
        params: { stems: ['vocals', 'drums', 'bass', 'other'] },
      },
      {
        type: 'ddsp',
        name: 'DDSP Timbre Transfer',
        icon: '🎸',
        description: 'Change instrument timbres',
        params: { harmonics: 40, formantShift: 0, noiseRatio: 20 },
      },
      {
        type: 'style_transfer',
        name: 'Style Transfer',
        icon: '🎨',
        description: 'Apply genre transformation',
        params: { genre: 'electronic', intensity: 70 },
      },
    ],
  },
  {
    id: 'quality-boost',
    name: 'Quality Boost',
    description: 'Maximum quality enhancement with 4x upsampling',
    icon: '⚡',
    nodes: [
      {
        type: 'audiosr',
        name: 'Audio SR 4x',
        icon: '⬆️⬆️',
        description: '4x upsampling',
        params: { upsampleFactor: 4, enhancementLevel: 'high' },
      },
      {
        type: 'auto_mastering',
        name: 'Auto Mastering',
        icon: '✨',
        description: 'Loudness normalization',
        params: { preset: 'master', loudness: -16 },
      },
    ],
  },
  {
    id: 'stem-separator',
    name: 'Stem Separator',
    description: 'Extract individual stems with enhancement',
    icon: '🎼',
    nodes: [
      {
        type: 'demucs',
        name: 'Demucs 4-Stem Export',
        icon: '🎵',
        description: 'High-quality stem separation',
        params: { stems: ['vocals', 'drums', 'bass', 'other'], quality: 'high' },
      },
    ],
  },
  {
    id: 'genre-analyzer',
    name: 'Genre Analyzer',
    description: 'Analyze musical genre and characteristics',
    icon: '🔍',
    nodes: [
      {
        type: 'genre_detection',
        name: 'Genre Classification',
        icon: '🏷️',
        description: 'Detect genre with confidence',
        params: {},
      },
    ],
  },
];

export function AIPipelineBuilder() {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customNodes, setCustomNodes] = useState<PipelineNode[]>([]);
  const [processingQueue] = useState(() => new ProcessingQueue());
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  // Update jobs when queue changes
  processingQueue.onStatus(() => {
    setJobs(processingQueue.getAllJobs());
  });

  const handleLoadPreset = (presetId: string) => {
    const preset = PRESET_PIPELINES.find((p) => p.id === presetId);
    if (!preset) return;

    setSelectedPreset(presetId);
    setCustomNodes(
      preset.nodes.map((node, index) => ({
        id: `node-${Date.now()}-${index}`,
        ...node,
        enabled: true,
      }))
    );
  };

  const handleToggleNode = (nodeId: string) => {
    setCustomNodes((prev) =>
      prev.map((node) =>
        node.id === nodeId ? { ...node, enabled: !node.enabled } : node
      )
    );
  };

  const handleProcessPipeline = async () => {
    if (!audioFile) {
      alert('Please select an audio file first');
      return;
    }

    // Load audio file into AudioBuffer
    const audioBuffer = await loadAudioFile(audioFile);

    // Add each enabled node as a job to the queue
    let currentInput = audioBuffer;

    for (const node of customNodes) {
      if (!node.enabled) continue;

      const jobId = processingQueue.addJob(
        node.name,
        node.type,
        currentInput,
        node.params,
        0 // Priority
      );

      // Wait for job to complete before adding next
      await waitForJobCompletion(jobId);

      // Get result for next node
      const job = processingQueue.getJob(jobId);
      if (job?.result) {
        currentInput = job.result;
      }
    }

    alert('Pipeline processing complete!');
  };

  const loadAudioFile = async (file: File): Promise<AudioBuffer> => {
    const audioContext = new AudioContext();
    const arrayBuffer = await file.arrayBuffer();
    return await audioContext.decodeAudioData(arrayBuffer);
  };

  const waitForJobCompletion = (jobId: string): Promise<void> => {
    return new Promise((resolve) => {
      processingQueue.onJobStatus(jobId, (job) => {
        if (job.status === 'completed' || job.status === 'failed') {
          resolve();
        }
      });
    });
  };

  const stats = processingQueue.getStats();

  return (
    <div className="ai-pipeline-builder bg-gray-900 text-white rounded-lg p-6 border border-gray-700">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold flex items-center gap-2">
          <span>🤖</span> AI Pipeline Builder
        </h2>
        <p className="text-gray-400 mt-2">
          Build custom AI processing pipelines or use presets
        </p>
      </div>

      {/* Preset Pipelines */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">📚 Preset Pipelines</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRESET_PIPELINES.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleLoadPreset(preset.id)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selectedPreset === preset.id
                  ? 'border-blue-500 bg-blue-900/30'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              }`}
            >
              <div className="text-3xl mb-2">{preset.icon}</div>
              <h4 className="font-bold text-lg mb-1">{preset.name}</h4>
              <p className="text-sm text-gray-400">{preset.description}</p>
              <div className="mt-3 text-xs text-gray-500">
                {preset.nodes.length} steps
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Pipeline Nodes */}
      {customNodes.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">🔗 Pipeline Steps</h3>
          <div className="space-y-3">
            {customNodes.map((node, index) => (
              <div
                key={node.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  node.enabled
                    ? 'border-blue-500/50 bg-blue-900/20'
                    : 'border-gray-700 bg-gray-800/50 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="text-2xl">{node.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-500">
                          STEP {index + 1}
                        </span>
                        <span className="text-xs text-gray-600">→</span>
                        <h4 className="font-bold">{node.name}</h4>
                      </div>
                      <p className="text-sm text-gray-400">{node.description}</p>

                      {/* Parameters */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {Object.entries(node.params).map(([key, value]) => (
                          <span
                            key={key}
                            className="text-xs bg-gray-700/50 px-2 py-1 rounded"
                          >
                            {key}: <span className="text-blue-400">{String(value)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Toggle */}
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={node.enabled}
                      onChange={() => handleToggleNode(node.id)}
                      className="w-5 h-5"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File Input & Process Button */}
      {customNodes.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-4">🎵 Input Audio</h3>

          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
            className="mb-4 block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
          />

          {audioFile && (
            <div className="mb-4 text-sm text-green-400">
              ✅ Selected: {audioFile.name}
            </div>
          )}

          <button
            onClick={handleProcessPipeline}
            disabled={!audioFile || stats.processing > 0}
            className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
              !audioFile || stats.processing > 0
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg'
            }`}
          >
            {stats.processing > 0 ? (
              <>
                <span className="inline-block animate-spin mr-2">⏳</span>
                Processing...
              </>
            ) : (
              '🚀 Run Pipeline'
            )}
          </button>
        </div>
      )}

      {/* Processing Queue Status */}
      {jobs.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">⏳ Processing Queue</h3>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-400">{stats.pending}</div>
              <div className="text-xs text-gray-400">Pending</div>
            </div>
            <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-yellow-400">{stats.processing}</div>
              <div className="text-xs text-gray-400">Processing</div>
            </div>
            <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
              <div className="text-xs text-gray-400">Completed</div>
            </div>
            <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
              <div className="text-xs text-gray-400">Failed</div>
            </div>
          </div>

          {/* Job List */}
          <div className="space-y-2">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="bg-gray-800 rounded-lg p-3 border border-gray-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">
                    {job.status === 'processing' && '⚙️ '}
                    {job.status === 'completed' && '✅ '}
                    {job.status === 'failed' && '❌ '}
                    {job.status === 'pending' && '⏳ '}
                    {job.name}
                  </span>
                  <span className="text-sm text-gray-400">{job.status}</span>
                </div>

                {job.status === 'processing' && (
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                )}

                {job.error && (
                  <div className="text-sm text-red-400 mt-2">Error: {job.error}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {customNodes.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <div className="text-6xl mb-4">🎨</div>
          <p className="text-lg">Select a preset pipeline to get started</p>
        </div>
      )}
    </div>
  );
}

export default AIPipelineBuilder;
