// Simple EQ node implementation
export interface EQNode {
  input: AudioNode;
  output: AudioNode;
  lowGain: AudioParam;
  midGain: AudioParam;
  highGain: AudioParam;
}

// Factory function to create an EQNode
export function createEQNode(context: BaseAudioContext): EQNode {
  // Create the main audio nodes
  const input = context.createGain();
  const output = context.createGain();
  
  // Create the EQ filters
  const low = context.createBiquadFilter();
  const mid = context.createBiquadFilter();
  const high = context.createBiquadFilter();
  
  // Configure filters
  // Low shelf filter (bass)
  low.type = 'lowshelf';
  low.frequency.value = 250;
  
  // Peaking filter (mid)
  mid.type = 'peaking';
  mid.frequency.value = 1000;
  mid.Q.value = 1;
  
  // High shelf filter (treble)
  high.type = 'highshelf';
  high.frequency.value = 4000;
  
  // Connect the nodes: input -> low -> mid -> high -> output
  input.connect(low);
  low.connect(mid);
  mid.connect(high);
  high.connect(output);
  
  const eqNode = {
    input,
    output,
    lowGain: low.gain,
    midGain: mid.gain,
    highGain: high.gain
  };
  
  // Set initial gains to 0dB (no change)
  eqNode.lowGain.value = 0;
  eqNode.midGain.value = 0;
  eqNode.highGain.value = 0;
  
  // Return the EQ node
  return eqNode;
}
