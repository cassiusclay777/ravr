import { AudioTrack } from '../audio/AutoTrackDetector';

export interface GenreAnalysis {
  genre: string;
  confidence: number;
  subgenres: string[];
  characteristics: string[];
}

export interface AudioAnalysis {
  tempo: number;
  key: string;
  energy: number;
  danceability: number;
  mood: 'happy' | 'sad' | 'energetic' | 'calm' | 'aggressive' | 'melancholic';
}

export class AIGenreDetection {
  private static genreDatabase = {
    'electronic': {
      keywords: ['synth', 'electronic', 'edm', 'techno', 'house', 'trance', 'dubstep'],
      subgenres: ['House', 'Techno', 'Trance', 'Dubstep', 'Ambient', 'IDM'],
      characteristics: ['Synthesized sounds', 'Digital effects', 'Repetitive beats']
    },
    'rock': {
      keywords: ['rock', 'metal', 'punk', 'alternative', 'indie'],
      subgenres: ['Classic Rock', 'Metal', 'Punk', 'Alternative', 'Indie Rock'],
      characteristics: ['Guitar-driven', 'Strong rhythm', 'Powerful vocals']
    },
    'pop': {
      keywords: ['pop', 'mainstream', 'chart', 'hit'],
      subgenres: ['Pop Rock', 'Dance Pop', 'Electropop', 'Teen Pop'],
      characteristics: ['Catchy melodies', 'Commercial appeal', 'Radio-friendly']
    },
    'jazz': {
      keywords: ['jazz', 'swing', 'blues', 'bebop', 'fusion'],
      subgenres: ['Swing', 'Bebop', 'Fusion', 'Smooth Jazz', 'Free Jazz'],
      characteristics: ['Improvisation', 'Complex harmonies', 'Swing rhythm']
    },
    'classical': {
      keywords: ['classical', 'orchestra', 'symphony', 'concerto', 'opera'],
      subgenres: ['Baroque', 'Romantic', 'Contemporary', 'Chamber Music'],
      characteristics: ['Orchestral instruments', 'Complex compositions', 'Traditional forms']
    },
    'hip-hop': {
      keywords: ['hip-hop', 'rap', 'hip hop', 'urban', 'beats'],
      subgenres: ['Old School', 'Trap', 'Conscious Rap', 'Gangsta Rap'],
      characteristics: ['Rhythmic speech', 'Strong beats', 'Urban themes']
    },
    'ambient': {
      keywords: ['ambient', 'atmospheric', 'soundscape', 'meditation', 'chill'],
      subgenres: ['Dark Ambient', 'Space Ambient', 'Drone', 'New Age'],
      characteristics: ['Atmospheric textures', 'Minimal beats', 'Relaxing']
    }
  };

  static async analyzeTrack(track: AudioTrack): Promise<GenreAnalysis> {
    // Simulace AI analýzy - v reálné aplikaci by se použil ML model
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    // Analýza na základě názvu, umělce a metadat
    const searchText = `${track.name} ${track.artist || ''} ${track.album || ''}`.toLowerCase();
    
    let bestMatch = 'electronic';
    let maxScore = 0;

    // Heuristic genre detection
    Object.entries(this.genreDatabase).forEach(([genre, data]) => {
      let score = 0;
      
      // Keyword matching
      data.keywords.forEach(keyword => {
        if (searchText.includes(keyword)) {
          score += 3;
        }
      });

      // Audio characteristics (simplified heuristics)
      if (track.sampleRate >= 48000) score += 1; // Higher quality often electronic/modern
      if (track.channels === 1) score -= 1; // Mono often older recordings
      if (track.duration > 600) score += (genre === 'classical' ? 2 : -1); // Long tracks often classical
      if (track.duration < 180) score += (genre === 'pop' ? 1 : 0); // Short tracks often pop

      if (score > maxScore) {
        maxScore = score;
        bestMatch = genre;
      }
    });

    const genreData = this.genreDatabase[bestMatch as keyof typeof this.genreDatabase];
    const confidence = Math.min(0.95, Math.max(0.3, maxScore / 5));

    return {
      genre: bestMatch.charAt(0).toUpperCase() + bestMatch.slice(1),
      confidence,
      subgenres: genreData.subgenres,
      characteristics: genreData.characteristics
    };
  }

  static async batchAnalyze(
    tracks: AudioTrack[], 
    onProgress?: (processed: number, total: number) => void
  ): Promise<Map<string, GenreAnalysis>> {
    const results = new Map<string, GenreAnalysis>();
    
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      
      if (onProgress) {
        onProgress(i, tracks.length);
      }

      try {
        const analysis = await this.analyzeTrack(track);
        results.set(track.id, analysis);
      } catch (error) {
        console.error('Genre analysis failed for track:', track.name, error);
        // Fallback genre
        results.set(track.id, {
          genre: 'Unknown',
          confidence: 0.1,
          subgenres: [],
          characteristics: []
        });
      }

      // Small delay to prevent blocking UI
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 5));
      }
    }

    if (onProgress) {
      onProgress(tracks.length, tracks.length);
    }

    return results;
  }

  static async getAudioAnalysis(track: AudioTrack): Promise<AudioAnalysis> {
    // Simulace pokročilé audio analýzy
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));

    // Heuristic analysis based on available metadata
    const duration = track.duration;
    const sampleRate = track.sampleRate;
    const name = track.name.toLowerCase();

    // Tempo estimation (simplified)
    let tempo = 120; // Default BPM
    if (name.includes('slow') || name.includes('ballad')) tempo = 70 + Math.random() * 30;
    else if (name.includes('fast') || name.includes('dance')) tempo = 120 + Math.random() * 40;
    else tempo = 90 + Math.random() * 60;

    // Key detection (randomized for demo)
    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const modes = ['major', 'minor'];
    const key = keys[Math.floor(Math.random() * keys.length)] + ' ' + modes[Math.floor(Math.random() * modes.length)];

    // Energy and danceability (0-1 scale)
    const energy = Math.random();
    const danceability = Math.random();

    // Mood detection based on various factors
    const moods: AudioAnalysis['mood'][] = ['happy', 'sad', 'energetic', 'calm', 'aggressive', 'melancholic'];
    let mood: AudioAnalysis['mood'] = 'calm';
    
    if (energy > 0.7 && danceability > 0.6) mood = 'energetic';
    else if (energy < 0.3) mood = 'calm';
    else if (tempo > 140) mood = 'energetic';
    else if (tempo < 80) mood = 'melancholic';
    else mood = moods[Math.floor(Math.random() * moods.length)];

    return {
      tempo: Math.round(tempo),
      key,
      energy: Math.round(energy * 100) / 100,
      danceability: Math.round(danceability * 100) / 100,
      mood
    };
  }

  static getGenreColor(genre: string): string {
    const colors: Record<string, string> = {
      'Electronic': '#4f46e5',
      'Rock': '#dc2626',
      'Pop': '#ec4899',
      'Jazz': '#f59e0b',
      'Classical': '#7c3aed',
      'Hip-hop': '#059669',
      'Ambient': '#06b6d4',
      'Unknown': '#6b7280'
    };
    
    return colors[genre] || colors['Unknown'];
  }
}
