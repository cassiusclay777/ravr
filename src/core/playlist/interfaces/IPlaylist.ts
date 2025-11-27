/**
 * Playlist Interface
 *
 * Playlist management with support for normal and smart playlists.
 * Inspired by foobar2000's playlist system.
 */

import type { Track } from '../../audio/models/Track';

/**
 * Base Playlist Interface
 */
export interface IPlaylist {
  /**
   * Unique playlist identifier
   */
  readonly id: string;

  /**
   * Playlist name
   */
  name: string;

  /**
   * Playlist type
   */
  readonly type: PlaylistType;

  /**
   * Get all tracks
   */
  getTracks(): Track[];

  /**
   * Get track count
   */
  getCount(): number;

  /**
   * Get track at index
   */
  getTrackAt(index: number): Track | null;

  /**
   * Get total duration
   */
  getTotalDuration(): number;

  /**
   * Clear playlist
   */
  clear(): void;

  /**
   * Serialize playlist
   */
  serialize(): PlaylistConfig;

  /**
   * Subscribe to playlist events
   */
  on(event: PlaylistEvent, callback: PlaylistEventCallback): void;
  off(event: PlaylistEvent, callback: PlaylistEventCallback): void;
}

/**
 * Static Playlist (normal playlist)
 */
export interface IStaticPlaylist extends IPlaylist {
  readonly type: 'static';

  /**
   * Add track
   */
  addTrack(track: Track): void;

  /**
   * Add multiple tracks
   */
  addTracks(tracks: Track[]): void;

  /**
   * Insert track at index
   */
  insertTrack(track: Track, index: number): void;

  /**
   * Remove track at index
   */
  removeTrack(index: number): void;

  /**
   * Remove multiple tracks by indices
   */
  removeTracks(indices: number[]): void;

  /**
   * Move track from one index to another
   */
  moveTrack(fromIndex: number, toIndex: number): void;

  /**
   * Shuffle playlist
   */
  shuffle(): void;

  /**
   * Sort playlist
   */
  sort(field: SortField, order: 'asc' | 'desc'): void;

  /**
   * Remove duplicates
   */
  removeDuplicates(): void;

  /**
   * Remove dead/missing items
   */
  removeDeadItems(): Promise<void>;
}

/**
 * Smart Playlist (rule-based, dynamic)
 */
export interface ISmartPlaylist extends IPlaylist {
  readonly type: 'smart';

  /**
   * Get playlist rules
   */
  getRules(): PlaylistRule[];

  /**
   * Set playlist rules
   */
  setRules(rules: PlaylistRule[]): void;

  /**
   * Refresh playlist (re-evaluate rules)
   */
  refresh(): Promise<void>;

  /**
   * Get matching track count without loading tracks
   */
  getMatchCount(): Promise<number>;

  /**
   * Auto-refresh when library changes
   */
  autoRefresh: boolean;

  /**
   * Maximum number of tracks (0 = unlimited)
   */
  limit: number;
}

/**
 * Playback Queue
 */
export interface IPlaybackQueue {
  /**
   * Get queue tracks
   */
  getTracks(): Track[];

  /**
   * Add track to queue
   */
  addTrack(track: Track): void;

  /**
   * Add tracks to queue
   */
  addTracks(tracks: Track[]): void;

  /**
   * Insert track at position
   */
  insertTrack(track: Track, index: number): void;

  /**
   * Remove track at index
   */
  removeTrack(index: number): void;

  /**
   * Clear queue
   */
  clear(): void;

  /**
   * Get next track (and remove from queue)
   */
  getNext(): Track | null;

  /**
   * Peek at next track (without removing)
   */
  peekNext(): Track | null;

  /**
   * Get queue length
   */
  getLength(): number;

  /**
   * Subscribe to queue events
   */
  on(event: QueueEvent, callback: QueueEventCallback): void;
  off(event: QueueEvent, callback: QueueEventCallback): void;
}

/**
 * Playlist Type
 */
export type PlaylistType = 'static' | 'smart';

/**
 * Playlist Rule (for smart playlists)
 */
export interface PlaylistRule {
  /**
   * Field to match
   */
  field: RuleField;

  /**
   * Match operator
   */
  operator: RuleOperator;

  /**
   * Value to compare
   */
  value: string | number | boolean | Date;

  /**
   * Combine with next rule (AND/OR)
   */
  combinator?: 'and' | 'or';
}

export type RuleField =
  | 'title'
  | 'artist'
  | 'album'
  | 'genre'
  | 'year'
  | 'rating'
  | 'playCount'
  | 'lastPlayed'
  | 'dateAdded'
  | 'duration'
  | 'sampleRate'
  | 'bitrate'
  | 'codec'
  | 'lossless';

export type RuleOperator =
  // String operators
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'is'
  | 'isNot'
  // Number operators
  | 'equals'
  | 'notEquals'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual'
  | 'between'
  // Date operators
  | 'inTheLast'
  | 'notInTheLast'
  | 'before'
  | 'after'
  // Boolean operators
  | 'isTrue'
  | 'isFalse';

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
  | 'trackNumber';

/**
 * Playlist Configuration (for serialization)
 */
export interface PlaylistConfig {
  id: string;
  name: string;
  type: PlaylistType;
  tracks?: string[]; // Track IDs for static playlists
  rules?: PlaylistRule[]; // Rules for smart playlists
  autoRefresh?: boolean;
  limit?: number;
  created?: string;
  modified?: string;
}

/**
 * Playlist Events
 */
export type PlaylistEvent =
  | 'trackAdded'
  | 'trackRemoved'
  | 'trackMoved'
  | 'cleared'
  | 'sorted'
  | 'rulesChanged'
  | 'refreshed';

export type PlaylistEventCallback = (data?: any) => void;

/**
 * Queue Events
 */
export type QueueEvent =
  | 'trackAdded'
  | 'trackRemoved'
  | 'cleared'
  | 'nextTrackChanged';

export type QueueEventCallback = (data?: any) => void;

/**
 * Playlist Manager
 */
export interface IPlaylistManager {
  /**
   * Create new static playlist
   */
  createStaticPlaylist(name: string): IStaticPlaylist;

  /**
   * Create new smart playlist
   */
  createSmartPlaylist(name: string, rules: PlaylistRule[]): ISmartPlaylist;

  /**
   * Get all playlists
   */
  getPlaylists(): IPlaylist[];

  /**
   * Get playlist by ID
   */
  getPlaylist(id: string): IPlaylist | null;

  /**
   * Delete playlist
   */
  deletePlaylist(id: string): void;

  /**
   * Import playlist from file (.m3u, .pls, .xspf)
   */
  importPlaylist(filePath: string): Promise<IStaticPlaylist>;

  /**
   * Export playlist to file
   */
  exportPlaylist(playlistId: string, filePath: string, format: PlaylistFormat): Promise<void>;

  /**
   * Get playback queue
   */
  getQueue(): IPlaybackQueue;
}

/**
 * Playlist export formats
 */
export type PlaylistFormat = 'm3u' | 'm3u8' | 'pls' | 'xspf' | 'json';
