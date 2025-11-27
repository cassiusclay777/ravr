// Type for CompressorNode with additional properties
export type ICompressorNode = DynamicsCompressorNode & {
  // Add any additional methods or properties here if needed
};

// Factory function to create a CompressorNode
export function createCompressorNode(context: AudioContext | OfflineAudioContext): ICompressorNode {
  const compressor = context.createDynamicsCompressor() as ICompressorNode;
  
  // Set reasonable default values for music
  compressor.threshold.value = -24; // dB
  compressor.ratio.value = 4; // 4:1
  compressor.attack.value = 0.003; // 3ms
  compressor.release.value = 0.25; // 250ms
  compressor.knee.value = 10; // Soft knee
  
  return compressor;
}
