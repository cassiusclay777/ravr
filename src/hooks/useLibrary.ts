import { useEffect, useState, useCallback } from 'react';
import type { ScanProgress } from '@/audio/BulkTrackDetector';
import type { AudioTrack } from '@/audio/AutoTrackDetector';

export interface Track {
  id: string;
  name: string;
  artist?: string;
  album?: string;
  duration?: number;
  url: string;
  filePath?: string; // For reference
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
}

interface StoredFolder {
  name: string;
  handle: FileSystemDirectoryHandle;
}

interface StoredTrackData {
  id: string;
  name: string;
  artist?: string;
  album?: string;
  duration?: number;
  filePath: string;
  folderName: string;
}

const DB_NAME = 'ravr-library';
const DB_VERSION = 2;
const FOLDERS_STORE = 'folders';
const TRACKS_STORE = 'tracks';

class LibraryDB {
  private db: IDBDatabase | null = null;

  async init() {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = request.result;
        
        if (!db.objectStoreNames.contains(FOLDERS_STORE)) {
          db.createObjectStore(FOLDERS_STORE, { keyPath: 'name' });
        }
        
        if (!db.objectStoreNames.contains(TRACKS_STORE)) {
          const trackStore = db.createObjectStore(TRACKS_STORE, { keyPath: 'id' });
          trackStore.createIndex('folderName', 'folderName', { unique: false });
        }
      };
    });
  }

  async storeFolderHandle(name: string, handle: FileSystemDirectoryHandle) {
    if (!this.db) await this.init();
    const tx = this.db!.transaction([FOLDERS_STORE], 'readwrite');
    const store = tx.objectStore(FOLDERS_STORE);
    await store.put({ name, handle });
  }

  async getFolderHandles(): Promise<StoredFolder[]> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction([FOLDERS_STORE], 'readonly');
    const store = tx.objectStore(FOLDERS_STORE);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async storeTrack(track: StoredTrackData) {
    if (!this.db) await this.init();
    const tx = this.db!.transaction([TRACKS_STORE], 'readwrite');
    const store = tx.objectStore(TRACKS_STORE);
    await store.put(track);
  }

  async getTracks(): Promise<StoredTrackData[]> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction([TRACKS_STORE], 'readonly');
    const store = tx.objectStore(TRACKS_STORE);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clearTracks() {
    if (!this.db) await this.init();
    const tx = this.db!.transaction([TRACKS_STORE], 'readwrite');
    const store = tx.objectStore(TRACKS_STORE);
    await store.clear();
  }
}

const libraryDB = new LibraryDB();

// Cache for File objects
const fileCache = new Map<string, File>();

async function getFileFromHandle(
  dirHandle: FileSystemDirectoryHandle,
  filePath: string
): Promise<File | null> {
  try {
    const pathParts = filePath.split('/');
    let currentHandle: FileSystemDirectoryHandle | FileSystemFileHandle = dirHandle;

    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      if (i === pathParts.length - 1) {
        // Last part is the file
        currentHandle = await (currentHandle as FileSystemDirectoryHandle).getFileHandle(part);
        return await (currentHandle as FileSystemFileHandle).getFile();
      } else {
        // Navigate to subdirectory
        currentHandle = await (currentHandle as FileSystemDirectoryHandle).getDirectoryHandle(part);
      }
    }
  } catch (error) {
    console.error(`Failed to get file ${filePath}:`, error);
  }
  return null;
}

export function useLibrary() {
  const [folders, setFolders] = useState<string[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [lists, setLists] = useState<Playlist[]>(() =>
    JSON.parse(localStorage.getItem('ravr.playlists') || '[]'),
  );
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    localStorage.setItem('ravr.playlists', JSON.stringify(lists));
  }, [lists]);

  // Load tracks from IndexedDB on mount
  useEffect(() => {
    async function loadTracksFromDB() {
      try {
        const storedTracks = await libraryDB.getTracks();
        const folderHandles = await libraryDB.getFolderHandles();
        
        // Convert stored tracks to Track objects with temporary URLs
        const loadedTracks: Track[] = storedTracks.map(st => ({
          id: st.id,
          name: st.name,
          artist: st.artist,
          album: st.album,
          duration: st.duration,
          url: '', // Will be generated when track is played
          filePath: st.filePath,
        }));

        setTracks(loadedTracks);
        setFolders(folderHandles.map(f => f.name));
      } catch (error) {
        console.error('Failed to load tracks:', error);
      }
    }

    loadTracksFromDB();
  }, []);

  const addFolder = useCallback(async () => {
    try {
      setIsScanning(true);
      setScanProgress({ processed: 0, total: 0, currentFile: '', isScanning: true });
      
      // @ts-ignore
      const dirHandle = await window.showDirectoryPicker();
      const folderName = dirHandle.name;

      // Store handle in IndexedDB
      await libraryDB.storeFolderHandle(folderName, dirHandle);
      setFolders((f) => [...f, folderName]);

      // Scan directory with progress
      // Dynamic import to avoid eager loading FFmpeg
      const { BulkTrackDetector } = await import('@/audio/BulkTrackDetector');
      const results = await BulkTrackDetector.scanDirectory(
        dirHandle,
        (progress) => setScanProgress(progress)
      );

      // Store tracks in IndexedDB and create Track objects
      const newTracks: Track[] = [];
      let fileIndex = 0;

      // Helper function to recursively collect files with paths
      const collectFilesWithPaths = async (
        handle: FileSystemDirectoryHandle,
        currentPath: string = ''
      ): Promise<{ file: File; path: string }[]> => {
        const files: { file: File; path: string }[] = [];
        
        // @ts-ignore
        for await (const [name, entry] of handle.entries()) {
          const newPath = currentPath ? `${currentPath}/${name}` : name;
          
          if (entry.kind === 'file') {
            const file = await entry.getFile();
            const { BulkTrackDetector: BTD } = await import('@/audio/BulkTrackDetector');
            if (BTD.isAudioFile(file.name)) {
              files.push({ file, path: newPath });
            }
          } else if (entry.kind === 'directory') {
            const subFiles = await collectFilesWithPaths(entry, newPath);
            files.push(...subFiles);
          }
        }
        
        return files;
      };

      const filesWithPaths = await collectFilesWithPaths(dirHandle);

      for (const audioTrack of results.tracks) {
        if (fileIndex < filesWithPaths.length) {
          const { file, path } = filesWithPaths[fileIndex];
          const trackId = crypto.randomUUID();
          
          // Store in IndexedDB
          const storedTrack: StoredTrackData = {
            id: trackId,
            name: audioTrack.title || file.name,
            artist: audioTrack.artist,
            album: audioTrack.album,
            duration: audioTrack.duration,
            filePath: path,
            folderName,
          };
          
          await libraryDB.storeTrack(storedTrack);

          // Create Track object with cached file
          const track: Track = {
            id: trackId,
            name: audioTrack.title || file.name,
            artist: audioTrack.artist,
            album: audioTrack.album,
            duration: audioTrack.duration,
            url: URL.createObjectURL(file),
            filePath: path,
          };

          // Cache the file
          fileCache.set(trackId, file);
          
          newTracks.push(track);
          fileIndex++;
        }
      }

      setTracks((prev) => [...prev, ...newTracks]);
      
      console.log(`✅ Added ${results.successCount}/${results.totalFiles} tracks from ${folderName}`);
      if (results.errors.length > 0) {
        console.warn(`⚠️ ${results.errors.length} files had errors`);
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('Folder selection cancelled');
      } else {
        console.error('Error adding folder:', error);
      }
    } finally {
      setIsScanning(false);
      setScanProgress(null);
    }
  }, []);

  const clearLibrary = useCallback(async () => {
    setTracks([]);
    setFolders([]);
    await libraryDB.clearTracks();
    fileCache.clear();
  }, []);

  const getTrackUrl = useCallback(async (trackId: string): Promise<string | null> => {
    // Check cache first
    const cachedFile = fileCache.get(trackId);
    if (cachedFile) {
      return URL.createObjectURL(cachedFile);
    }

    // Try to get from folder handle
    const track = tracks.find(t => t.id === trackId);
    if (!track || !track.filePath) return null;

    try {
      const storedTrack = (await libraryDB.getTracks()).find(t => t.id === trackId);
      if (!storedTrack) return null;

      const folderHandles = await libraryDB.getFolderHandles();
      const folderHandle = folderHandles.find(f => f.name === storedTrack.folderName);
      if (!folderHandle) return null;

      const file = await getFileFromHandle(folderHandle.handle, track.filePath);
      if (file) {
        fileCache.set(trackId, file);
        return URL.createObjectURL(file);
      }
    } catch (error) {
      console.error('Failed to get track URL:', error);
    }

    return null;
  }, [tracks]);

  function createPlaylist(name: string) {
    const newPlaylist: Playlist = {
      id: crypto.randomUUID(),
      name,
      trackIds: [],
    };
    setLists((prev) => [...prev, newPlaylist]);
  }

  function addToPlaylist(playlistId: string, trackId: string) {
    setLists((prev) =>
      prev.map((list) =>
        list.id === playlistId ? { ...list, trackIds: [...list.trackIds, trackId] } : list,
      ),
    );
  }

  function removePlaylist(playlistId: string) {
    setLists((prev) => prev.filter((list) => list.id !== playlistId));
  }

  return {
    tracks,
    folders,
    lists,
    scanProgress,
    isScanning,
    addFolder,
    clearLibrary,
    getTrackUrl,
    createPlaylist,
    addToPlaylist,
    removePlaylist,
  };
}
