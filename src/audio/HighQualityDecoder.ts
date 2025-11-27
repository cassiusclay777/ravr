export class HighQualityDecoder {
  private context: AudioContext;

  constructor(context: AudioContext) {
    this.context = context;
  }

  /**
   * Decode audio with maximum quality settings
   */
  async decodeAudioData(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    try {
      // Use the highest quality decoding available
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer.slice(0));
      
      // Verify the decoded buffer meets quality standards
      this.validateAudioBuffer(audioBuffer);
      
      return audioBuffer;
    } catch (error) {
      console.error('High-quality audio decoding failed:', error);
      throw new Error(`Audio decoding failed: ${error}`);
    }
  }

  /**
   * Validate audio buffer quality
   */
  private validateAudioBuffer(buffer: AudioBuffer): void {
    if (buffer.sampleRate < 44100) {
      console.warn(`Low sample rate detected: ${buffer.sampleRate}Hz. Consider using higher quality source.`);
    }
    
    if (buffer.numberOfChannels < 2) {
      console.warn('Mono audio detected. Stereo processing may be limited.');
    }
    
    if (buffer.length === 0) {
      throw new Error('Empty audio buffer');
    }
  }

  /**
   * Apply high-quality resampling if needed
   */
  async resampleIfNeeded(buffer: AudioBuffer, targetSampleRate: number): Promise<AudioBuffer> {
    if (buffer.sampleRate === targetSampleRate) {
      return buffer;
    }

    // Create offline context for resampling
    const offlineContext = new OfflineAudioContext(
      buffer.numberOfChannels,
      Math.ceil(buffer.length * targetSampleRate / buffer.sampleRate),
      targetSampleRate
    );

    const source = offlineContext.createBufferSource();
    source.buffer = buffer;
    source.connect(offlineContext.destination);
    source.start();

    return await offlineContext.startRendering();
  }
}
