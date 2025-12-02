/**
 * LyricsDetection - AI Lyrics Detection & Transcription
 * Využívá Whisper AI model pro automatickou detekci a transkripci textu
 * + Source separation pro izolaci vokálů
 */

export interface LyricsSegment {
  start: number; // seconds
  end: number; // seconds
  text: string;
  confidence: number; // 0-1
}

export interface LyricsData {
  segments: LyricsSegment[];
  fullText: string;
  language: string;
  duration: number;
}

export interface TranscriptionOptions {
  language?: string; // 'en', 'cs', 'auto', etc.
  task?: 'transcribe' | 'translate'; // translate = translate to English
  separateVocals?: boolean; // Use source separation first
  model?: 'tiny' | 'base' | 'small' | 'medium' | 'large'; // Whisper model size
}

/**
 * Lyrics Detection & Transcription
 */
export class LyricsDetection {
  private whisperModel: any = null;
  private isInitialized = false;
  private modelSize: string = 'base';

  constructor() {}

  /**
   * Initialize Whisper model
   */
  async initialize(modelSize: 'tiny' | 'base' | 'small' | 'medium' | 'large' = 'base'): Promise<void> {
    if (this.isInitialized) {
      console.log('[LyricsDetection] Already initialized');
      return;
    }

    this.modelSize = modelSize;

    console.log(`[LyricsDetection] Initializing Whisper ${modelSize} model...`);

    try {
      // In browser, we'd use transformers.js or whisper.cpp via WASM
      // This is a placeholder for the actual implementation
      // Real implementation would use: @xenova/transformers or whisper-web

      // Example with @xenova/transformers (install via npm):
      // const { pipeline } = await import('@xenova/transformers');
      // this.whisperModel = await pipeline('automatic-speech-recognition', `openai/whisper-${modelSize}`);

      console.log('[LyricsDetection] Whisper model initialized');
      this.isInitialized = true;
    } catch (error) {
      console.error('[LyricsDetection] Failed to initialize Whisper:', error);
      throw error;
    }
  }

  /**
   * Detect and transcribe lyrics from audio
   */
  async detectLyrics(
    audioBuffer: AudioBuffer,
    options: TranscriptionOptions = {}
  ): Promise<LyricsData> {
    if (!this.isInitialized) {
      console.warn('[LyricsDetection] Model not initialized, initializing now...');
      await this.initialize(options.model || 'base');
    }

    console.log('[LyricsDetection] Starting lyrics detection...');

    const {
      language = 'auto',
      task = 'transcribe',
      separateVocals = true,
    } = options;

    try {
      // Step 1: Separate vocals if requested
      let processedAudio = audioBuffer;
      if (separateVocals) {
        console.log('[LyricsDetection] Separating vocals...');
        processedAudio = await this.separateVocals(audioBuffer);
      }

      // Step 2: Convert to format suitable for Whisper
      const audioData = this.prepareAudioForWhisper(processedAudio);

      // Step 3: Run Whisper transcription
      const transcription = await this.transcribeAudio(audioData, language, task);

      // Step 4: Process and structure results
      const lyricsData = this.processTranscription(transcription, audioBuffer.duration);

      console.log(`[LyricsDetection] Detected ${lyricsData.segments.length} lyrics segments`);
      return lyricsData;
    } catch (error) {
      console.error('[LyricsDetection] Lyrics detection failed:', error);
      throw error;
    }
  }

  /**
   * Separate vocals from audio using source separation
   */
  private async separateVocals(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
    // Simplified vocal separation using spectral filtering
    // In production, this would use Demucs or Spleeter model

    const context = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    const source = context.createBufferSource();
    source.buffer = audioBuffer;

    // High-pass filter to remove low frequencies (bass, drums)
    const highPass = context.createBiquadFilter();
    highPass.type = 'highpass';
    highPass.frequency.value = 200;
    highPass.Q.value = 0.707;

    // Low-pass filter to remove very high frequencies
    const lowPass = context.createBiquadFilter();
    lowPass.type = 'lowpass';
    lowPass.frequency.value = 3500;
    lowPass.Q.value = 0.707;

    // Boost mid frequencies where vocals typically are
    const midBoost = context.createBiquadFilter();
    midBoost.type = 'peaking';
    midBoost.frequency.value = 1500;
    midBoost.Q.value = 1.0;
    midBoost.gain.value = 6; // +6dB

    // Connect processing chain
    source.connect(highPass);
    highPass.connect(midBoost);
    midBoost.connect(lowPass);
    lowPass.connect(context.destination);

    source.start(0);

    const renderedBuffer = await context.startRendering();
    console.log('[LyricsDetection] Vocal separation complete');

    return renderedBuffer;
  }

  /**
   * Prepare audio for Whisper (convert to mono, resample to 16kHz)
   */
  private prepareAudioForWhisper(audioBuffer: AudioBuffer): Float32Array {
    const targetSampleRate = 16000; // Whisper expects 16kHz
    const duration = audioBuffer.duration;
    const targetLength = Math.floor(duration * targetSampleRate);

    // Convert to mono if stereo
    const monoData = new Float32Array(audioBuffer.length);
    if (audioBuffer.numberOfChannels === 1) {
      monoData.set(audioBuffer.getChannelData(0));
    } else {
      const left = audioBuffer.getChannelData(0);
      const right = audioBuffer.getChannelData(1);
      for (let i = 0; i < audioBuffer.length; i++) {
        monoData[i] = (left[i] + right[i]) / 2;
      }
    }

    // Resample to 16kHz
    const resampled = this.resample(
      monoData,
      audioBuffer.sampleRate,
      targetSampleRate
    );

    return resampled;
  }

  /**
   * Simple linear resampling
   */
  private resample(
    buffer: Float32Array,
    fromRate: number,
    toRate: number
  ): Float32Array {
    const ratio = fromRate / toRate;
    const newLength = Math.floor(buffer.length / ratio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const srcIndex = i * ratio;
      const srcIndexFloor = Math.floor(srcIndex);
      const srcIndexCeil = Math.min(srcIndexFloor + 1, buffer.length - 1);
      const t = srcIndex - srcIndexFloor;

      // Linear interpolation
      result[i] = buffer[srcIndexFloor] * (1 - t) + buffer[srcIndexCeil] * t;
    }

    return result;
  }

  /**
   * Transcribe audio using Whisper
   */
  private async transcribeAudio(
    audioData: Float32Array,
    language: string,
    task: 'transcribe' | 'translate'
  ): Promise<any> {
    // Placeholder for actual Whisper inference
    // Real implementation would use transformers.js or whisper.cpp WASM

    console.log('[LyricsDetection] Running Whisper transcription...');

    // Example with @xenova/transformers:
    /*
    const result = await this.whisperModel(audioData, {
      language: language === 'auto' ? undefined : language,
      task: task,
      return_timestamps: true,
      chunk_length_s: 30,
      stride_length_s: 5,
    });
    return result;
    */

    // Placeholder result for demo
    return {
      text: 'This is a placeholder transcription. Install @xenova/transformers for real lyrics detection.',
      chunks: [
        {
          text: 'This is a placeholder transcription.',
          timestamp: [0, 3.5]
        },
        {
          text: 'Install @xenova/transformers for real lyrics detection.',
          timestamp: [3.5, 7.2]
        }
      ]
    };
  }

  /**
   * Process transcription results into structured lyrics data
   */
  private processTranscription(transcription: any, duration: number): LyricsData {
    const segments: LyricsSegment[] = [];

    if (transcription.chunks) {
      for (const chunk of transcription.chunks) {
        segments.push({
          start: chunk.timestamp[0],
          end: chunk.timestamp[1],
          text: chunk.text.trim(),
          confidence: chunk.confidence || 0.9
        });
      }
    }

    const fullText = segments.map(s => s.text).join(' ');

    return {
      segments,
      fullText,
      language: transcription.language || 'unknown',
      duration
    };
  }

  /**
   * Search lyrics online (fallback if transcription fails)
   */
  async searchLyricsOnline(
    title: string,
    artist: string
  ): Promise<string | null> {
    try {
      // Use lyrics API (e.g., lyrics.ovh, genius.com API)
      const query = encodeURIComponent(`${artist} ${title}`);
      const apiUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;

      const response = await fetch(apiUrl);
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.lyrics || null;
    } catch (error) {
      console.error('[LyricsDetection] Online lyrics search failed:', error);
      return null;
    }
  }

  /**
   * Get lyrics with fallback strategy
   */
  async getLyrics(
    audioBuffer: AudioBuffer,
    metadata?: { title?: string; artist?: string },
    options: TranscriptionOptions = {}
  ): Promise<LyricsData | null> {
    try {
      // Try AI transcription first
      const lyricsData = await this.detectLyrics(audioBuffer, options);

      if (lyricsData.fullText.length > 10) {
        return lyricsData;
      }

      // Fallback to online search if metadata available
      if (metadata?.title && metadata?.artist) {
        console.log('[LyricsDetection] Falling back to online lyrics search...');
        const onlineLyrics = await this.searchLyricsOnline(
          metadata.title,
          metadata.artist
        );

        if (onlineLyrics) {
          return {
            segments: [{
              start: 0,
              end: audioBuffer.duration,
              text: onlineLyrics,
              confidence: 1.0
            }],
            fullText: onlineLyrics,
            language: 'unknown',
            duration: audioBuffer.duration
          };
        }
      }

      return null;
    } catch (error) {
      console.error('[LyricsDetection] Failed to get lyrics:', error);
      return null;
    }
  }

  /**
   * Export lyrics to LRC format (synced lyrics)
   */
  exportToLRC(lyricsData: LyricsData, metadata?: { title?: string; artist?: string; album?: string }): string {
    let lrc = '';

    // Add metadata tags
    if (metadata?.title) {
      lrc += `[ti:${metadata.title}]\n`;
    }
    if (metadata?.artist) {
      lrc += `[ar:${metadata.artist}]\n`;
    }
    if (metadata?.album) {
      lrc += `[al:${metadata.album}]\n`;
    }
    lrc += '[by:RAVR Audio Engine - AI Lyrics Detection]\n';
    lrc += `[length:${this.formatTime(lyricsData.duration)}]\n`;
    lrc += '\n';

    // Add lyrics with timestamps
    for (const segment of lyricsData.segments) {
      const timestamp = this.formatLRCTimestamp(segment.start);
      lrc += `[${timestamp}]${segment.text}\n`;
    }

    return lrc;
  }

  /**
   * Format timestamp for LRC (mm:ss.xx)
   */
  private formatLRCTimestamp(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const centiseconds = Math.floor((seconds % 1) * 100);

    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
  }

  /**
   * Format time (mm:ss)
   */
  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  /**
   * Import lyrics from LRC format
   */
  importFromLRC(lrcContent: string, duration: number): LyricsData {
    const segments: LyricsSegment[] = [];
    const lines = lrcContent.split('\n');

    for (const line of lines) {
      // Match timestamp pattern [mm:ss.xx]
      const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2})\](.*)/);
      if (match) {
        const minutes = parseInt(match[1]);
        const seconds = parseInt(match[2]);
        const centiseconds = parseInt(match[3]);
        const text = match[4].trim();

        const start = minutes * 60 + seconds + centiseconds / 100;

        segments.push({
          start,
          end: start + 3, // Placeholder, will be updated
          text,
          confidence: 1.0
        });
      }
    }

    // Update end times based on next segment start
    for (let i = 0; i < segments.length - 1; i++) {
      segments[i].end = segments[i + 1].start;
    }
    if (segments.length > 0) {
      segments[segments.length - 1].end = duration;
    }

    const fullText = segments.map(s => s.text).join('\n');

    return {
      segments,
      fullText,
      language: 'unknown',
      duration
    };
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    this.whisperModel = null;
    this.isInitialized = false;
    console.log('[LyricsDetection] Disposed');
  }
}

// Export singleton
export const lyricsDetection = new LyricsDetection();
