// Experimental Mobile Media Scanner
// Pro detekci hudby na mobilních zařízeních

export interface MobileMediaFile {
  name: string;
  size: number;
  lastModified: number;
  type: string;
  file?: File;
}

export class MobileMediaScanner {
  
  // Zkusí najít hudbu pomocí Media Session API (experimentální)
  static async scanMediaLibrary(): Promise<MobileMediaFile[]> {
    const mediaFiles: MobileMediaFile[] = [];

    try {
      // Pokud je dostupné MediaDevices API
      if ('mediaDevices' in navigator) {
        console.log('MediaDevices API available');
      }

      // Zkusíme použít File System Access API (Chrome/Edge)
      if ('showOpenFilePicker' in window) {
        console.log('File System Access API available');
      }

      // Fallback: Požádáme o input s multiple files
      return this.requestMultipleFiles();
      
    } catch (error) {
      console.error('Mobile media scanning failed:', error);
      throw new Error('Automatické skenování není na tomto zařízení podporováno');
    }
  }

  // Požádá uživatele o výběr více souborů najednou
  private static async requestMultipleFiles(): Promise<MobileMediaFile[]> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = 'audio/*';
      
      input.onchange = (event) => {
        const files = (event.target as HTMLInputElement).files;
        if (files) {
          const mediaFiles: MobileMediaFile[] = Array.from(files).map(file => ({
            name: file.name,
            size: file.size,
            lastModified: file.lastModified,
            type: file.type,
            file: file
          }));
          resolve(mediaFiles);
        } else {
          resolve([]);
        }
      };
      
      input.oncancel = () => resolve([]);
      input.click();
    });
  }

  // Zkusí detekovat, zda jsme na mobilním zařízení
  static isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  // Získá doporučené metody pro skenování na aktuálním zařízení
  static getRecommendedScanMethods(): string[] {
    const methods: string[] = [];
    
    if ('showDirectoryPicker' in window) {
      methods.push('directory');
    }
    
    if ('showOpenFilePicker' in window) {
      methods.push('files');
    }
    
    methods.push('input'); // Vždy dostupné
    
    if (this.isMobileDevice()) {
      methods.push('mobile-optimized');
    }
    
    return methods;
  }

  // Optimalizované načítání pro mobilní zařízení
  static async loadFilesWithProgress(
    files: File[], 
    onProgress?: (processed: number, total: number, current: string) => void
  ): Promise<File[]> {
    const validFiles: File[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (onProgress) {
        onProgress(i, files.length, file.name);
      }
      
      // Ověřit, že je to audio soubor
      if (this.isAudioFile(file)) {
        validFiles.push(file);
      }
      
      // Malá pauza pro responsive UI
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 5));
      }
    }
    
    return validFiles;
  }

  private static isAudioFile(file: File): boolean {
    const audioTypes = [
      'audio/',
      'application/ogg',
      'video/mp4', // M4A files
    ];
    
    const audioExtensions = [
      '.mp3', '.wav', '.flac', '.ogg', '.aac', '.m4a', 
      '.wma', '.opus', '.webm'
    ];
    
    return audioTypes.some(type => file.type.startsWith(type)) ||
           audioExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  }

  // Vytvoří URL pro náhled/přehrání souboru
  static createPreviewUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  // Uvolní URL po použití
  static revokePreviewUrl(url: string): void {
    URL.revokeObjectURL(url);
  }
}
