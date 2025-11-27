import { AutoTrackDetector, AudioTrack } from './AutoTrackDetector';

export interface ScanProgress {
  processed: number;
  total: number;
  currentFile: string;
  isScanning: boolean;
}

export interface ScanResults {
  tracks: AudioTrack[];
  errors: { file: string; error: string }[];
  totalFiles: number;
  successCount: number;
}

export class BulkTrackDetector {
  private static audioExtensions = new Set([
    'mp3', 'wav', 'flac', 'ogg', 'aac', 'm4a', 'wma', 'opus', 'webm', 'mp4'
  ]);

  static async scanMultipleFiles(
    files: FileList | File[], 
    onProgress?: (progress: ScanProgress) => void
  ): Promise<ScanResults> {
    const fileArray = Array.from(files);
    const results: ScanResults = {
      tracks: [],
      errors: [],
      totalFiles: fileArray.length,
      successCount: 0
    };

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      
      // Update progress
      if (onProgress) {
        onProgress({
          processed: i,
          total: fileArray.length,
          currentFile: file.name,
          isScanning: true
        });
      }

      try {
        const tracks = await AutoTrackDetector.detectTracksFromFile(file);
        results.tracks.push(...tracks);
        results.successCount++;
      } catch (error) {
        results.errors.push({
          file: file.name,
          error: error instanceof Error ? error.message : 'Neznámá chyba'
        });
      }

      // Malá pauza aby neblokoval UI
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Final progress update
    if (onProgress) {
      onProgress({
        processed: fileArray.length,
        total: fileArray.length,
        currentFile: '',
        isScanning: false
      });
    }

    return results;
  }

  static async scanDirectory(
    dirHandle: FileSystemDirectoryHandle,
    onProgress?: (progress: ScanProgress) => void
  ): Promise<ScanResults> {
    const files: File[] = [];
    await this.collectFilesFromDirectory(dirHandle, files);
    
    return this.scanMultipleFiles(files, onProgress);
  }

  private static async collectFilesFromDirectory(
    dirHandle: FileSystemDirectoryHandle, 
    files: File[]
  ): Promise<void> {
    try {
      // @ts-ignore - File System Access API není plně typizované
      for await (const [name, entry] of dirHandle.entries()) {
        if (entry.kind === 'file') {
          const file = await entry.getFile();
          const extension = file.name.split('.').pop()?.toLowerCase();
          
          if (extension && this.audioExtensions.has(extension)) {
            files.push(file);
          }
        } else if (entry.kind === 'directory') {
          // Rekurzivně projdeme podadresáře
          await this.collectFilesFromDirectory(entry, files);
        }
      }
    } catch (error) {
      console.error('Error scanning directory:', error);
    }
  }

  // Pokus o automatické nalezení hudby v systému
  static async findMusicAutomatically(
    onProgress?: (progress: ScanProgress) => void
  ): Promise<ScanResults> {
    try {
      // Pokud je podporováno File System Access API
      if ('showDirectoryPicker' in window) {
        // Zkusíme nejprve najít Music složku
        const musicDirs = await this.findMusicDirectories();
        
        if (musicDirs.length > 0) {
          const allResults: ScanResults = {
            tracks: [],
            errors: [],
            totalFiles: 0,
            successCount: 0
          };

          for (const dirHandle of musicDirs) {
            const results = await this.scanDirectory(dirHandle, onProgress);
            allResults.tracks.push(...results.tracks);
            allResults.errors.push(...results.errors);
            allResults.totalFiles += results.totalFiles;
            allResults.successCount += results.successCount;
          }

          return allResults;
        }
      }
    } catch (error) {
      console.error('Auto-discovery failed:', error);
    }

    // Fallback - požádáme uživatele o výběr složky
    throw new Error('Automatické skenování není podporováno. Použijte manuální výběr složky.');
  }

  private static async findMusicDirectories(): Promise<FileSystemDirectoryHandle[]> {
    const musicDirs: FileSystemDirectoryHandle[] = [];
    
    try {
      // Pokusíme se získat přístup k typickým hudebním složkám
      const commonMusicPaths = ['Music', 'Documents/Music', 'Downloads'];
      
      for (const path of commonMusicPaths) {
        try {
          // This is a simplified approach - real implementation would need
          // to work with the File System Access API properly
          console.log(`Looking for music in: ${path}`);
        } catch (error) {
          // Ignore errors for now
        }
      }
    } catch (error) {
      console.error('Failed to find music directories:', error);
    }

    return musicDirs;
  }

  static isAudioFile(filename: string): boolean {
    const extension = filename.split('.').pop()?.toLowerCase();
    return extension ? this.audioExtensions.has(extension) : false;
  }

  static getSupportedExtensions(): string[] {
    return Array.from(this.audioExtensions);
  }
}
