/**
 * Audio Source Interface
 *
 * Abstraction for audio sources (local files, network shares, streaming services)
 * Inspired by UAPP's network support and Neutron's source flexibility.
 */

export interface IAudioSource {
  /**
   * Source identifier
   */
  readonly id: string;

  /**
   * Source type
   */
  readonly type: SourceType;

  /**
   * Source name/description
   */
  readonly name: string;

  /**
   * Is source available/connected
   */
  isAvailable(): Promise<boolean>;

  /**
   * Open connection to source
   */
  connect(): Promise<void>;

  /**
   * Close connection
   */
  disconnect(): Promise<void>;

  /**
   * List files in directory/path
   * @param path - Path within source (relative)
   */
  listFiles(path: string): Promise<SourceFile[]>;

  /**
   * Get file as stream
   * @param path - File path
   */
  getFileStream(path: string): Promise<ReadableStream<Uint8Array>>;

  /**
   * Get file as buffer
   * @param path - File path
   */
  getFileBuffer(path: string): Promise<ArrayBuffer>;

  /**
   * Check if file exists
   */
  fileExists(path: string): Promise<boolean>;

  /**
   * Get file metadata
   */
  getFileInfo(path: string): Promise<FileInfo>;

  /**
   * Subscribe to source events
   */
  on(event: SourceEvent, callback: SourceEventCallback): void;
  off(event: SourceEvent, callback: SourceEventCallback): void;
}

/**
 * Source Types
 */
export type SourceType =
  // Local
  | 'local' // Local file system
  | 'usb' // USB drive/storage
  // Network file sources
  | 'smb' // SMB/CIFS network share
  | 'ftp' // FTP server
  | 'sftp' // SFTP server
  | 'webdav' // WebDAV server
  | 'nfs' // NFS share
  // Media servers
  | 'upnp' // UPnP/DLNA media server
  | 'plex' // Plex media server
  | 'emby' // Emby media server
  | 'jellyfin' // Jellyfin media server
  // Streaming services
  | 'tidal' // TIDAL
  | 'qobuz' // Qobuz
  | 'deezer' // Deezer
  | 'spotify' // Spotify
  // Cloud storage
  | 'dropbox' // Dropbox
  | 'onedrive' // OneDrive
  | 'google-drive'; // Google Drive

/**
 * File in source
 */
export interface SourceFile {
  name: string;
  path: string; // Relative path within source
  type: 'file' | 'directory';
  size?: number; // bytes
  modified?: Date;
  isAudioFile?: boolean;
}

/**
 * File information
 */
export interface FileInfo {
  name: string;
  path: string;
  size: number; // bytes
  mimeType?: string;
  modified?: Date;
  created?: Date;
}

/**
 * Source Events
 */
export type SourceEvent =
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'fileAdded'
  | 'fileRemoved'
  | 'fileChanged';

export type SourceEventCallback = (data?: any) => void;

/**
 * Network Source Configuration
 */
export interface NetworkSourceConfig {
  type: SourceType;
  name: string;
  host: string;
  port?: number;
  path?: string;
  username?: string;
  password?: string;
  secure?: boolean; // Use TLS/SSL
  timeout?: number; // Connection timeout (ms)
}

/**
 * SMB/CIFS Source
 */
export interface ISMBSource extends IAudioSource {
  readonly type: 'smb';
  configure(config: SMBConfig): void;
}

export interface SMBConfig {
  host: string;
  share: string;
  domain?: string;
  username: string;
  password: string;
  workgroup?: string;
}

/**
 * FTP Source
 */
export interface IFTPSource extends IAudioSource {
  readonly type: 'ftp' | 'sftp';
  configure(config: FTPConfig): void;
}

export interface FTPConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  secure: boolean; // FTPS or SFTP
  passive?: boolean;
}

/**
 * WebDAV Source
 */
export interface IWebDAVSource extends IAudioSource {
  readonly type: 'webdav';
  configure(config: WebDAVConfig): void;
}

export interface WebDAVConfig {
  url: string;
  username: string;
  password: string;
  secure: boolean;
}

/**
 * UPnP/DLNA Media Server
 */
export interface IUPnPSource extends IAudioSource {
  readonly type: 'upnp';

  /**
   * Discover UPnP servers on network
   */
  discoverServers(): Promise<UPnPServer[]>;

  /**
   * Connect to specific server
   */
  connectToServer(serverId: string): Promise<void>;

  /**
   * Browse UPnP directory structure
   */
  browse(containerId: string): Promise<UPnPItem[]>;
}

export interface UPnPServer {
  id: string;
  name: string;
  manufacturer?: string;
  model?: string;
  ip: string;
}

export interface UPnPItem {
  id: string;
  parentId: string;
  title: string;
  type: 'container' | 'item';
  class: string; // UPnP class (e.g., 'object.item.audioItem.musicTrack')
  albumArtUri?: string;
  resources?: UPnPResource[];
}

export interface UPnPResource {
  uri: string;
  protocolInfo: string;
  size?: number;
  duration?: string;
  bitrate?: number;
  sampleFrequency?: number;
  nrAudioChannels?: number;
}
