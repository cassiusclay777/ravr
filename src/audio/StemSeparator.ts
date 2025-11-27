export class StemSeparator {
  private audioContext: AudioContext;
  private sourceBuffer: AudioBuffer | null = null;

  constructor(context: AudioContext) {
    this.audioContext = context;
  }

  async separateStems(audioBuffer: AudioBuffer): Promise<SeparatedStems> {
    this.sourceBuffer = audioBuffer;
    
    const vocals = await this.extractVocals(audioBuffer);
    const drums = await this.extractDrums(audioBuffer);
    const bass = await this.extractBass(audioBuffer);
    const instruments = await this.extractInstruments(audioBuffer);

    return { vocals, drums, bass, instruments };
  }

  private async extractVocals(buffer: AudioBuffer): Promise<AudioBuffer> {
    // Center channel extraction for vocals
    const leftChannel = buffer.getChannelData(0);
    const rightChannel = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : leftChannel;
    
    const vocalBuffer = this.audioContext.createBuffer(1, buffer.length, buffer.sampleRate);
    const vocalData = vocalBuffer.getChannelData(0);

    // Extract center (vocals) using mid-side processing
    for (let i = 0; i < buffer.length; i++) {
      const mid = (leftChannel[i] + rightChannel[i]) / 2;
      const side = (leftChannel[i] - rightChannel[i]) / 2;
      
      // Enhance vocals by focusing on mid frequencies
      const freq = (i / buffer.length) * (buffer.sampleRate / 2);
      if (freq > 200 && freq < 4000) {
        vocalData[i] = mid * 1.5;
      } else {
        vocalData[i] = mid * 0.3;
      }
    }

    return vocalBuffer;
  }

  private async extractDrums(buffer: AudioBuffer): Promise<AudioBuffer> {
    const drumBuffer = this.audioContext.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
    
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const inputData = buffer.getChannelData(channel);
      const outputData = drumBuffer.getChannelData(channel);
      
      // High-pass filter for drums (transients)
      let prevInput = 0;
      let prevOutput = 0;
      const cutoff = 80; // Hz
      const rc = 1 / (2 * Math.PI * cutoff);
      const dt = 1 / buffer.sampleRate;
      const alpha = rc / (rc + dt);

      for (let i = 0; i < buffer.length; i++) {
        const highpass = alpha * (prevOutput + inputData[i] - prevInput);
        
        // Enhance transients (drum hits)
        const transientEnhance = Math.abs(inputData[i] - prevInput) * 2;
        outputData[i] = highpass + transientEnhance;
        
        prevInput = inputData[i];
        prevOutput = highpass;
      }
    }

    return drumBuffer;
  }

  private async extractBass(buffer: AudioBuffer): Promise<AudioBuffer> {
    const bassBuffer = this.audioContext.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
    
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const inputData = buffer.getChannelData(channel);
      const outputData = bassBuffer.getChannelData(channel);
      
      // Low-pass filter for bass
      let prevOutput = 0;
      const cutoff = 150; // Hz
      const rc = 1 / (2 * Math.PI * cutoff);
      const dt = 1 / buffer.sampleRate;
      const alpha = dt / (rc + dt);

      for (let i = 0; i < buffer.length; i++) {
        const lowpass = prevOutput + alpha * (inputData[i] - prevOutput);
        outputData[i] = lowpass * 2; // Boost bass
        prevOutput = lowpass;
      }
    }

    return bassBuffer;
  }

  private async extractInstruments(buffer: AudioBuffer): Promise<AudioBuffer> {
    const instrumentBuffer = this.audioContext.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
    
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const inputData = buffer.getChannelData(channel);
      const outputData = instrumentBuffer.getChannelData(channel);
      
      // Band-pass filter for instruments (mid frequencies)
      for (let i = 0; i < buffer.length; i++) {
        const freq = (i / buffer.length) * (buffer.sampleRate / 2);
        if (freq > 150 && freq < 8000) {
          outputData[i] = inputData[i];
        } else {
          outputData[i] = inputData[i] * 0.2;
        }
      }
    }

    return instrumentBuffer;
  }

  createKaraokeMode(): AudioNode {
    const splitter = this.audioContext.createChannelSplitter(2);
    const merger = this.audioContext.createChannelMerger(2);
    const inverter = this.audioContext.createGain();
    const mixer = this.audioContext.createGain();
    
    inverter.gain.value = -1;
    mixer.gain.value = 0.5;

    // L + (-R) = removes center channel (vocals)
    splitter.connect(mixer, 0);
    splitter.connect(inverter, 1);
    inverter.connect(mixer);
    
    mixer.connect(merger, 0, 0);
    mixer.connect(merger, 0, 1);

    return { input: splitter, output: merger } as any;
  }
}

interface SeparatedStems {
  vocals: AudioBuffer;
  drums: AudioBuffer;
  bass: AudioBuffer;
  instruments: AudioBuffer;
}
