/**
 * Music Library Interface
 *
 * Main interface for music library management, indexing, and querying.
 * Inspired by foobar2000's Media Library and Neutron's file browser.
 */

import type { Track } from '../../audio/models/Track';

export interface ILibrary {
  /**
   * Add source folder to library
   */
  addSource(path: string, recursive: boolean): Promise<void>;

  /**
   * Remove source folder
   */
  removeSource(path: string): Promise<void>;

  /**
   * Get all source folders
   */
  getSources(): string[];

  /**
   * Scan/rescan library
   */
  scan(incremental: boolean): Promise<ScanResult>;

  /**
   * Get all tracks
   */
  getAllTracks(): Promise<Track[]>;

  /**
   * Get track by ID
   */
  getTrack(id: string): Promise<Track | null>;

  /**
   * Get tracks by IDs
   */
  getTracks(ids: string[]): Promise<Track[]>;

  /**
   * Search library
   */
  search(query: LibraryQuery): Promise<Track[]>;

  /**
   * Get all artists
   */
  getArtists(): Promise<Artist[]>;

  /**
   * Get all albums
   */
  getAlbums(): Promise<Album[]>;

  /**
   * Get albums by artist
   */
  getAlbumsByArtist(artistName: string): Promise<Album[]>;

  /**
   * Get tracks by album
   */
  getTracksByAlbum(albumName: string, artistName?: string): Promise<Track[]>;

  /**
   * Get all genres
   */
  getGenres(): Promise<Genre[]>;

  /**
   * Get tracks by genre
   */
  getTracksByGenre(genre: string): Promise<Track[]>;

  /**
   * Get library statistics
   */
  getStatistics(): Promise<LibraryStatistics>;

  /**
   * Update track metadata
   */
  updateTrack(trackId: string, metadata: Partial<Track>): Promise<void>;

  /**
   * Remove track from library
   */
  removeTrack(trackId: string): Promise<void>;

  /**
   * Clear entire library
   */
  clear(): Promise<void>;

  /**
   * Subscribe to library events
   */
  on(event: LibraryEvent, callback: LibraryEventCallback): void;
  off(event: LibraryEvent, callback: LibraryEventCallback): void;
}

/**
 * Library Query Builder
 */
export interface LibraryQuery {
  /**
   * Text search (searches title, artist, album)
   */
  text?: string;

  /**
   * Filter by artist
   */
  artist?: string;

  /**
   * Filter by album
   */
  album?: string;

  /**
   * Filter by genre
   */
  genre?: string | string[];

  /**
   * Filter by year range
   */
  yearRange?: {
    from?: number;
    to?: number;
  };

  /**
   * Filter by rating
   */
  rating?: {
    min?: number;
    max?: number;
  };

  /**
   * Filter by format
   */
  format?: {
    codec?: string | string[];
    lossless?: boolean;
    minSampleRate?: number;
    minBitDepth?: number;
  };

  /**
   * Filter by date added
   */
  dateAdded?: {
    from?: Date;
    to?: Date;
  };

  /**
   * Sort options
   */
  sort?: {
    field: SortField;
    order: 'asc' | 'desc';
  };

  /**
   * Pagination
   */
  limit?: number;
  offset?: number;
}

export type SortField =
  | 'title'
  | 'artist'
  | 'album'
  | 'year'
  | 'genre'
  | 'duration'
  | 'dateAdded'
  | 'playCount'
  | 'rating'
  | 'sampleRate'
  | 'bitrate';

/**
 * Artist Entity
 */
export interface Artist {
  name: string;
  albumCount: number;
  trackCount: number;
  genres?: string[];
  artwork?: string;
  musicBrainzId?: string;
}

/**
 * Album Entity
 */
export interface Album {
  title: string;
  artist: string;
  year?: number;
  genre?: string;
  trackCount: number;
  duration: number; // total duration in seconds
  artwork?: string;
  discCount?: number;
  musicBrainzId?: string;
  tracks?: Track[];
}

/**
 * Genre Entity
 */
export interface Genre {
  name: string;
  trackCount: number;
  artistCount: number;
}

/**
 * Scan Result
 */
export interface ScanResult {
  tracksAdded: number;
  tracksUpdated: number;
  tracksRemoved: number;
  errors: ScanError[];
  duration: number; // ms
}

export interface ScanError {
  path: string;
  error: string;
}

/**
 * Library Statistics
 */
export interface LibraryStatistics {
  totalTracks: number;
  totalArtists: number;
  totalAlbums: number;
  totalGenres: number;
  totalDuration: number; // seconds
  totalSize: number; // bytes
  formatBreakdown: {
    codec: string;
    count: number;
    percentage: number;
  }[];
  qualityBreakdown: {
    lossless: number;
    lossy: number;
    hiRes: number;
  };
}

/**
 * Library Events
 */
export type LibraryEvent =
  | 'scanStarted'
  | 'scanProgress'
  | 'scanCompleted'
  | 'trackAdded'
  | 'trackUpdated'
  | 'trackRemoved'
  | 'sourceAdded'
  | 'sourceRemoved';

export type LibraryEventCallback = (data?: any) => void;

/**
 * Library Indexer Interface
 */
export interface ILibraryIndexer {
  /**
   * Index directory recursively
   */
  indexDirectory(
    path: string,
    recursive: boolean,
    onProgress?: (progress: IndexProgress) => void
  ): Promise<Track[]>;

  /**
   * Extract metadata from file
   */
  extractMetadata(filePath: string): Promise<Track>;

  /**
   * Check if file is audio
   */
  isAudioFile(filePath: string): boolean;

  /**
   * Get supported audio formats
   */
  getSupportedFormats(): string[];
}

/**
 * Index Progress
 */
export interface IndexProgress {
  currentFile: string;
  processed: number;
  total: number;
  percentage: number;
}
