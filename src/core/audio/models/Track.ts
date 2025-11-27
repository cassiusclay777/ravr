/**
 * Track Entity
 *
 * Represents a single audio track with metadata
 */

export interface Track {
  /**
   * Unique track identifier
   */
  id: string;

  /**
   * Track title
   */
  title: string;

  /**
   * Artist name(s)
   */
  artist?: string;
  artists?: string[]; // Multiple artists

  /**
   * Album title
   */
  album?: string;

  /**
   * Album artist
   */
  albumArtist?: string;

  /**
   * Track number
   */
  trackNumber?: number;

  /**
   * Disc number
   */
  discNumber?: number;

  /**
   * Release year
   */
  year?: number;

  /**
   * Genre(s)
   */
  genre?: string;
  genres?: string[];

  /**
   * Duration in seconds
   */
  duration: number;

  /**
   * File path or URL
   */
  path: string;

  /**
   * File size in bytes
   */
  fileSize?: number;

  /**
   * Audio format information
   */
  format?: {
    codec: string; // 'mp3', 'flac', 'wav', 'aac', 'm4a', 'ogg', etc.
    container: string; // File container format
    bitrate?: number; // kbps
    sampleRate: number; // Hz
    bitsPerSample?: number; // bit depth
    channels: number; // 1=mono, 2=stereo, etc.
    lossless: boolean;
  };

  /**
   * ReplayGain metadata
   */
  replayGain?: {
    trackGain?: number; // dB
    trackPeak?: number; // 0.0 - 1.0
    albumGain?: number; // dB
    albumPeak?: number; // 0.0 - 1.0
  };

  /**
   * Album artwork
   */
  artwork?: {
    url?: string; // URL to artwork image
    embedded?: boolean; // Is artwork embedded in file?
    mimeType?: string;
  };

  /**
   * User metadata
   */
  rating?: number; // 0-5 stars
  playCount?: number;
  lastPlayed?: Date;
  dateAdded?: Date;

  /**
   * Additional metadata
   */
  comment?: string;
  composer?: string;
  conductor?: string;
  publisher?: string;
  isrc?: string; // International Standard Recording Code
  musicBrainzId?: string;

  /**
   * Source information
   */
  source?: {
    type: 'local' | 'network' | 'streaming';
    location: string; // Network path, streaming service, etc.
  };
}

/**
 * Simplified track for UI display
 */
export interface TrackDisplay {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  artworkUrl?: string;
  formatInfo?: string; // e.g., "FLAC 24/96"
}

/**
 * Track factory helpers
 */
export class TrackUtils {
  /**
   * Create a track from file metadata
   */
  static fromMetadata(path: string, metadata: any): Track {
    return {
      id: this.generateId(path),
      title: metadata.common?.title || this.extractFilename(path),
      artist: metadata.common?.artist,
      artists: metadata.common?.artists,
      album: metadata.common?.album,
      albumArtist: metadata.common?.albumartist,
      trackNumber: metadata.common?.track?.no,
      discNumber: metadata.common?.disk?.no,
      year: metadata.common?.year,
      genre: metadata.common?.genre?.[0],
      genres: metadata.common?.genre,
      duration: metadata.format?.duration || 0,
      path,
      fileSize: metadata.format?.size,
      format: {
        codec: metadata.format?.codec || '',
        container: metadata.format?.container || '',
        bitrate: metadata.format?.bitrate ? Math.round(metadata.format.bitrate / 1000) : undefined,
        sampleRate: metadata.format?.sampleRate || 44100,
        bitsPerSample: metadata.format?.bitsPerSample,
        channels: metadata.format?.numberOfChannels || 2,
        lossless: metadata.format?.lossless || false,
      },
      replayGain: this.extractReplayGain(metadata),
      dateAdded: new Date(),
    };
  }

  /**
   * Generate unique track ID from path
   */
  static generateId(path: string): string {
    // Simple hash - in production, use better hashing
    return btoa(path).replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * Extract filename without extension
   */
  static extractFilename(path: string): string {
    const filename = path.split(/[\\/]/).pop() || path;
    return filename.replace(/\.[^.]+$/, '');
  }

  /**
   * Extract ReplayGain from metadata
   */
  static extractReplayGain(metadata: any): Track['replayGain'] | undefined {
    const rg = metadata.common?.replaygain;
    if (!rg) return undefined;

    return {
      trackGain: rg.track_gain?.ratio,
      trackPeak: rg.track_peak?.ratio,
      albumGain: rg.album_gain?.ratio,
      albumPeak: rg.album_peak?.ratio,
    };
  }

  /**
   * Format track for display
   */
  static toDisplay(track: Track): TrackDisplay {
    const formatInfo = track.format
      ? `${track.format.codec.toUpperCase()} ${track.format.bitsPerSample || 16}/${Math.round(track.format.sampleRate / 1000)}`
      : undefined;

    return {
      id: track.id,
      title: track.title,
      artist: track.artist || 'Unknown Artist',
      album: track.album,
      duration: track.duration,
      artworkUrl: track.artwork?.url,
      formatInfo,
    };
  }
}
