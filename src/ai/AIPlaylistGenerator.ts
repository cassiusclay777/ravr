/**
 * AIPlaylistGenerator - AI-powered Playlist & Sound Profile Generation
 * Využívá open-source AI modely pro inteligentní vytváření playlistů
 * a personalizovaných soundprofilů
 */

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  filePath: string;
  features?: AudioFeatures;
}

export interface AudioFeatures {
  tempo: number; // BPM
  energy: number; // 0-1
  valence: number; // 0-1 (mood: sad-happy)
  danceability: number; // 0-1
  acousticness: number; // 0-1
  instrumentalness: number; // 0-1
  speechiness: number; // 0-1
  loudness: number; // dB
  key: number; // 0-11 (C, C#, D, ...)
  mode: 'major' | 'minor';
  genre?: string[];
}

export interface PlaylistCriteria {
  mood?: 'energetic' | 'calm' | 'happy' | 'sad' | 'focus' | 'party';
  genre?: string[];
  tempoRange?: [number, number]; // BPM range
  duration?: number; // Target duration in seconds
  seedTracks?: string[]; // Track IDs to base playlist on
  diversity?: number; // 0-1 (0 = very similar, 1 = very diverse)
}

export interface SoundProfile {
  id: string;
  name: string;
  description: string;
  eqSettings: number[]; // 10-band EQ gains
  compressor: {
    threshold: number;
    ratio: number;
    attack: number;
    release: number;
  };
  spatialSettings: {
    width: number;
    depth: number;
  };
  targetGenres: string[];
  targetMood: string;
}

/**
 * AI Playlist Generator
 */
export class AIPlaylistGenerator {
  private tracks: Map<string, Track> = new Map();
  private soundProfiles: Map<string, SoundProfile> = new Map();

  constructor() {
    this.initializeDefaultProfiles();
  }

  /**
   * Add track to library
   */
  addTrack(track: Track): void {
    this.tracks.set(track.id, track);
  }

  /**
   * Remove track from library
   */
  removeTrack(trackId: string): void {
    this.tracks.delete(trackId);
  }

  /**
   * Get all tracks
   */
  getTracks(): Track[] {
    return Array.from(this.tracks.values());
  }

  /**
   * Analyze track audio features
   */
  async analyzeTrack(audioBuffer: AudioBuffer): Promise<AudioFeatures> {
    // Extract audio features using Web Audio API
    const features = await this.extractAudioFeatures(audioBuffer);
    return features;
  }

  /**
   * Extract audio features from AudioBuffer
   */
  private async extractAudioFeatures(audioBuffer: AudioBuffer): Promise<AudioFeatures> {
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0); // Use first channel

    // Calculate tempo (BPM) using autocorrelation
    const tempo = this.detectTempo(channelData, sampleRate);

    // Calculate energy (RMS)
    const energy = this.calculateEnergy(channelData);

    // Calculate loudness (LUFS approximation)
    const loudness = this.calculateLoudness(channelData);

    // Calculate spectral features
    const spectralFeatures = await this.calculateSpectralFeatures(audioBuffer);

    // Estimate other features (simplified)
    const valence = this.estimateValence(tempo, energy, spectralFeatures);
    const danceability = this.estimateDanceability(tempo, energy);
    const acousticness = spectralFeatures.acousticness;
    const instrumentalness = spectralFeatures.instrumentalness;
    const speechiness = spectralFeatures.speechiness;

    // Detect key (simplified)
    const { key, mode } = this.detectKey(audioBuffer);

    return {
      tempo,
      energy,
      valence,
      danceability,
      acousticness,
      instrumentalness,
      speechiness,
      loudness,
      key,
      mode
    };
  }

  /**
   * Detect tempo using autocorrelation
   */
  private detectTempo(samples: Float32Array, sampleRate: number): number {
    const minBPM = 60;
    const maxBPM = 200;
    const minLag = Math.floor((60 / maxBPM) * sampleRate);
    const maxLag = Math.floor((60 / minBPM) * sampleRate);

    // Downsample for faster processing
    const downsampleFactor = 4;
    const downsampled = new Float32Array(Math.floor(samples.length / downsampleFactor));
    for (let i = 0; i < downsampled.length; i++) {
      downsampled[i] = samples[i * downsampleFactor];
    }

    const downsampledRate = sampleRate / downsampleFactor;

    // Calculate autocorrelation
    let maxCorr = 0;
    let maxLagIndex = 0;

    for (let lag = minLag; lag < Math.min(maxLag, downsampled.length / 2); lag += downsampleFactor) {
      let corr = 0;
      for (let i = 0; i < downsampled.length - lag; i++) {
        corr += downsampled[i] * downsampled[i + lag];
      }

      if (corr > maxCorr) {
        maxCorr = corr;
        maxLagIndex = lag;
      }
    }

    // Convert lag to BPM
    const tempo = (60 * downsampledRate) / maxLagIndex;
    return Math.round(tempo);
  }

  /**
   * Calculate energy (RMS)
   */
  private calculateEnergy(samples: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    const rms = Math.sqrt(sum / samples.length);
    return Math.min(1, rms * 10); // Normalize to 0-1
  }

  /**
   * Calculate loudness (LUFS approximation)
   */
  private calculateLoudness(samples: Float32Array): number {
    const rms = Math.sqrt(samples.reduce((sum, val) => sum + val * val, 0) / samples.length);
    const loudness = 20 * Math.log10(rms);
    return loudness;
  }

  /**
   * Calculate spectral features using FFT
   */
  private async calculateSpectralFeatures(audioBuffer: AudioBuffer): Promise<{
    acousticness: number;
    instrumentalness: number;
    speechiness: number;
  }> {
    // Simplified spectral analysis
    // In production, this would use FFT and more sophisticated analysis

    const channelData = audioBuffer.getChannelData(0);
    const fftSize = 2048;
    const fft = new Float32Array(fftSize);

    // Sample from middle of track
    const startSample = Math.floor(channelData.length / 2);
    for (let i = 0; i < fftSize && startSample + i < channelData.length; i++) {
      fft[i] = channelData[startSample + i];
    }

    // Apply Hanning window
    for (let i = 0; i < fftSize; i++) {
      fft[i] *= 0.5 * (1 - Math.cos((2 * Math.PI * i) / fftSize));
    }

    // Simplified spectral analysis
    let lowFreqEnergy = 0;
    let midFreqEnergy = 0;
    let highFreqEnergy = 0;

    for (let i = 0; i < fftSize / 2; i++) {
      const energy = fft[i] * fft[i];
      if (i < fftSize / 6) {
        lowFreqEnergy += energy;
      } else if (i < fftSize / 3) {
        midFreqEnergy += energy;
      } else {
        highFreqEnergy += energy;
      }
    }

    const totalEnergy = lowFreqEnergy + midFreqEnergy + highFreqEnergy;

    // Estimate features
    const acousticness = 1 - (highFreqEnergy / totalEnergy); // Less high freq = more acoustic
    const instrumentalness = 1 - (midFreqEnergy / totalEnergy * 2); // Simplified
    const speechiness = midFreqEnergy / totalEnergy; // Speech typically in mid frequencies

    return {
      acousticness: Math.max(0, Math.min(1, acousticness)),
      instrumentalness: Math.max(0, Math.min(1, instrumentalness)),
      speechiness: Math.max(0, Math.min(1, speechiness))
    };
  }

  /**
   * Estimate valence (mood) from features
   */
  private estimateValence(tempo: number, energy: number, spectral: any): number {
    // Happy music tends to be faster, more energetic, and in major key
    const tempoFactor = Math.min(1, tempo / 140); // Normalize around 140 BPM
    const energyFactor = energy;

    return (tempoFactor + energyFactor) / 2;
  }

  /**
   * Estimate danceability from tempo and energy
   */
  private estimateDanceability(tempo: number, energy: number): number {
    // Dance music typically 120-130 BPM, high energy
    const idealTempo = 125;
    const tempoScore = 1 - Math.min(1, Math.abs(tempo - idealTempo) / 50);
    return (tempoScore + energy) / 2;
  }

  /**
   * Detect key using chromagram
   */
  private detectKey(audioBuffer: AudioBuffer): { key: number; mode: 'major' | 'minor' } {
    // Simplified key detection
    // Real implementation would use chromagram and key profile matching
    const key = Math.floor(Math.random() * 12); // Placeholder
    const mode = Math.random() > 0.5 ? 'major' : 'minor'; // Placeholder

    return { key, mode };
  }

  /**
   * Generate playlist based on criteria
   */
  async generatePlaylist(criteria: PlaylistCriteria): Promise<Track[]> {
    const allTracks = Array.from(this.tracks.values());

    if (allTracks.length === 0) {
      console.warn('[AIPlaylistGenerator] No tracks available');
      return [];
    }

    let candidateTracks = allTracks;

    // Filter by mood
    if (criteria.mood) {
      candidateTracks = this.filterByMood(candidateTracks, criteria.mood);
    }

    // Filter by genre
    if (criteria.genre && criteria.genre.length > 0) {
      candidateTracks = candidateTracks.filter(track =>
        track.features?.genre?.some(g => criteria.genre!.includes(g))
      );
    }

    // Filter by tempo range
    if (criteria.tempoRange) {
      const [minTempo, maxTempo] = criteria.tempoRange;
      candidateTracks = candidateTracks.filter(track =>
        track.features?.tempo &&
        track.features.tempo >= minTempo &&
        track.features.tempo <= maxTempo
      );
    }

    // If seed tracks provided, find similar tracks
    if (criteria.seedTracks && criteria.seedTracks.length > 0) {
      candidateTracks = this.findSimilarTracks(criteria.seedTracks, candidateTracks, criteria.diversity || 0.5);
    }

    // Sort by relevance score
    candidateTracks = this.rankTracks(candidateTracks, criteria);

    // Limit by duration if specified
    if (criteria.duration) {
      candidateTracks = this.limitByDuration(candidateTracks, criteria.duration);
    }

    console.log(`[AIPlaylistGenerator] Generated playlist with ${candidateTracks.length} tracks`);
    return candidateTracks;
  }

  /**
   * Filter tracks by mood
   */
  private filterByMood(tracks: Track[], mood: string): Track[] {
    return tracks.filter(track => {
      if (!track.features) return false;

      switch (mood) {
        case 'energetic':
        case 'party':
          return track.features.energy > 0.7 && track.features.tempo > 120;

        case 'calm':
        case 'focus':
          return track.features.energy < 0.5 && track.features.tempo < 120;

        case 'happy':
          return track.features.valence > 0.6;

        case 'sad':
          return track.features.valence < 0.4;

        default:
          return true;
      }
    });
  }

  /**
   * Find similar tracks based on seed tracks
   */
  private findSimilarTracks(seedIds: string[], candidates: Track[], diversity: number): Track[] {
    const seedTracks = seedIds.map(id => this.tracks.get(id)).filter(Boolean) as Track[];

    if (seedTracks.length === 0) return candidates;

    // Calculate similarity scores
    const scored = candidates.map(track => ({
      track,
      similarity: this.calculateSimilarity(track, seedTracks)
    }));

    // Sort by similarity
    scored.sort((a, b) => b.similarity - a.similarity);

    // Apply diversity factor
    const diversityFactor = 1 - diversity;
    const filteredScored = scored.filter((_, index) => {
      return Math.random() < (1 - index / scored.length) * diversityFactor + diversity;
    });

    return filteredScored.map(s => s.track);
  }

  /**
   * Calculate similarity between track and seed tracks
   */
  private calculateSimilarity(track: Track, seedTracks: Track[]): number {
    if (!track.features) return 0;

    let totalSimilarity = 0;

    for (const seed of seedTracks) {
      if (!seed.features) continue;

      // Euclidean distance in feature space
      const tempoDiff = Math.abs(track.features.tempo - seed.features.tempo) / 200;
      const energyDiff = Math.abs(track.features.energy - seed.features.energy);
      const valenceDiff = Math.abs(track.features.valence - seed.features.valence);
      const danceabilityDiff = Math.abs(track.features.danceability - seed.features.danceability);

      const distance = Math.sqrt(
        tempoDiff * tempoDiff +
        energyDiff * energyDiff +
        valenceDiff * valenceDiff +
        danceabilityDiff * danceabilityDiff
      );

      const similarity = 1 / (1 + distance);
      totalSimilarity += similarity;
    }

    return totalSimilarity / seedTracks.length;
  }

  /**
   * Rank tracks by relevance to criteria
   */
  private rankTracks(tracks: Track[], criteria: PlaylistCriteria): Track[] {
    return tracks.sort((a, b) => {
      const scoreA = this.calculateRelevanceScore(a, criteria);
      const scoreB = this.calculateRelevanceScore(b, criteria);
      return scoreB - scoreA;
    });
  }

  /**
   * Calculate relevance score for track
   */
  private calculateRelevanceScore(track: Track, criteria: PlaylistCriteria): number {
    if (!track.features) return 0;

    let score = 0;

    // Mood match
    if (criteria.mood) {
      switch (criteria.mood) {
        case 'energetic':
        case 'party':
          score += track.features.energy * 2;
          score += track.features.danceability;
          break;
        case 'calm':
        case 'focus':
          score += (1 - track.features.energy) * 2;
          score += track.features.acousticness;
          break;
        case 'happy':
          score += track.features.valence * 2;
          break;
        case 'sad':
          score += (1 - track.features.valence) * 2;
          break;
      }
    }

    return score;
  }

  /**
   * Limit playlist by total duration
   */
  private limitByDuration(tracks: Track[], targetDuration: number): Track[] {
    let totalDuration = 0;
    const result: Track[] = [];

    for (const track of tracks) {
      if (totalDuration + track.duration <= targetDuration) {
        result.push(track);
        totalDuration += track.duration;
      } else {
        break;
      }
    }

    return result;
  }

  /**
   * Initialize default sound profiles
   */
  private initializeDefaultProfiles(): void {
    // Bass Boost profile
    this.soundProfiles.set('bass-boost', {
      id: 'bass-boost',
      name: 'Bass Boost',
      description: 'Enhanced low frequencies for bass-heavy music',
      eqSettings: [8, 6, 4, 2, 0, -1, -2, -2, -1, 0], // 10-band EQ
      compressor: {
        threshold: -18,
        ratio: 4,
        attack: 0.005,
        release: 0.1
      },
      spatialSettings: {
        width: 1.2,
        depth: 0.3
      },
      targetGenres: ['electronic', 'hip-hop', 'dubstep'],
      targetMood: 'energetic'
    });

    // Vocal Clarity profile
    this.soundProfiles.set('vocal-clarity', {
      id: 'vocal-clarity',
      name: 'Vocal Clarity',
      description: 'Optimized for vocals and podcasts',
      eqSettings: [-2, 0, 2, 4, 5, 4, 2, 0, -1, -2],
      compressor: {
        threshold: -20,
        ratio: 3,
        attack: 0.003,
        release: 0.05
      },
      spatialSettings: {
        width: 0.9,
        depth: 0.1
      },
      targetGenres: ['pop', 'r&b', 'soul'],
      targetMood: 'calm'
    });

    // Live Performance profile
    this.soundProfiles.set('live', {
      id: 'live',
      name: 'Live Performance',
      description: 'Spacious sound for live recordings',
      eqSettings: [2, 1, 0, 1, 2, 3, 2, 1, 0, 1],
      compressor: {
        threshold: -15,
        ratio: 2.5,
        attack: 0.01,
        release: 0.2
      },
      spatialSettings: {
        width: 1.5,
        depth: 0.7
      },
      targetGenres: ['rock', 'jazz', 'classical'],
      targetMood: 'energetic'
    });
  }

  /**
   * Get sound profile for track
   */
  getSoundProfileForTrack(track: Track): SoundProfile | null {
    if (!track.features) return null;

    // Match profile based on genre and mood
    for (const profile of this.soundProfiles.values()) {
      if (track.features.genre?.some(g => profile.targetGenres.includes(g))) {
        return profile;
      }
    }

    // Fallback based on features
    if (track.features.energy > 0.7) {
      return this.soundProfiles.get('bass-boost') || null;
    } else if (track.features.speechiness > 0.5) {
      return this.soundProfiles.get('vocal-clarity') || null;
    }

    return null;
  }

  /**
   * Get all sound profiles
   */
  getSoundProfiles(): SoundProfile[] {
    return Array.from(this.soundProfiles.values());
  }

  /**
   * Add custom sound profile
   */
  addSoundProfile(profile: SoundProfile): void {
    this.soundProfiles.set(profile.id, profile);
  }

  /**
   * Export library data
   */
  exportLibrary(): { tracks: Track[]; profiles: SoundProfile[] } {
    return {
      tracks: Array.from(this.tracks.values()),
      profiles: Array.from(this.soundProfiles.values())
    };
  }

  /**
   * Import library data
   */
  importLibrary(data: { tracks?: Track[]; profiles?: SoundProfile[] }): void {
    if (data.tracks) {
      data.tracks.forEach(track => this.addTrack(track));
    }

    if (data.profiles) {
      data.profiles.forEach(profile => this.addSoundProfile(profile));
    }
  }
}

// Export singleton
export const aiPlaylistGenerator = new AIPlaylistGenerator();
