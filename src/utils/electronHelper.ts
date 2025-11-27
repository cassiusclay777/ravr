/**
 * Electron Helper Utilities
 * Provides helpers for Electron-specific functionality
 */

// Check if running in Electron
export const isElectron = (): boolean => {
  return !!(
    typeof window !== 'undefined' &&
    window.process &&
    window.process.type === 'renderer'
  ) || !!(
    typeof navigator !== 'undefined' &&
    navigator.userAgent &&
    navigator.userAgent.toLowerCase().indexOf('electron') > -1
  );
};

// Get Electron API if available
export const getElectronAPI = (): typeof window.electronAPI | null => {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return window.electronAPI;
  }
  return null;
};

// EUPH File Operations
export const readEuphFile = async (filePath: string): Promise<ArrayBuffer | null> => {
  const electronAPI = getElectronAPI();
  if (!electronAPI) {
    console.warn('Electron API not available for EUPH file reading');
    return null;
  }

  try {
    const result = await electronAPI.files.readEuphFile(filePath);
    if (result.success && result.data) {
      return result.data;
    }
    console.error('Failed to read EUPH file:', result.error);
    return null;
  } catch (error) {
    console.error('Error reading EUPH file:', error);
    return null;
  }
};

export const writeEuphFile = async (
  filePath: string,
  data: ArrayBuffer
): Promise<boolean> => {
  const electronAPI = getElectronAPI();
  if (!electronAPI) {
    console.warn('Electron API not available for EUPH file writing');
    return false;
  }

  try {
    const result = await electronAPI.files.writeEuphFile(filePath, data);
    return result.success;
  } catch (error) {
    console.error('Error writing EUPH file:', error);
    return false;
  }
};

// WASM Module Loading
export const loadWasmModule = async (modulePath: string): Promise<ArrayBuffer | null> => {
  const electronAPI = getElectronAPI();
  if (!electronAPI) {
    console.warn('Electron API not available for WASM loading');
    return null;
  }

  try {
    const result = await electronAPI.wasm.loadModule(modulePath);
    if (result.success && result.data) {
      return result.data;
    }
    console.error('Failed to load WASM module:', result.error);
    return null;
  } catch (error) {
    console.error('Error loading WASM module:', error);
    return null;
  }
};

// Audio Device Operations
export const getAudioDevices = async (): Promise<{
  inputs: any[];
  outputs: any[];
} | null> => {
  const electronAPI = getElectronAPI();
  if (!electronAPI) {
    console.warn('Electron API not available for audio device enumeration');
    return null;
  }

  try {
    return await electronAPI.audio.getDevices();
  } catch (error) {
    console.error('Error getting audio devices:', error);
    return null;
  }
};

// File Dialogs
export const showOpenDialog = async (options: any): Promise<string[] | null> => {
  const electronAPI = getElectronAPI();
  if (!electronAPI) {
    console.warn('Electron API not available for file dialog');
    return null;
  }

  try {
    const result = await electronAPI.files.showOpenDialog(options);
    if (!result.canceled && result.filePaths) {
      return result.filePaths;
    }
    return null;
  } catch (error) {
    console.error('Error showing open dialog:', error);
    return null;
  }
};

export const showSaveDialog = async (options: any): Promise<string | null> => {
  const electronAPI = getElectronAPI();
  if (!electronAPI) {
    console.warn('Electron API not available for save dialog');
    return null;
  }

  try {
    const result = await electronAPI.files.showSaveDialog(options);
    if (!result.canceled && result.filePath) {
      return result.filePath;
    }
    return null;
  } catch (error) {
    console.error('Error showing save dialog:', error);
    return null;
  }
};

// System Info
export const getSystemInfo = async (): Promise<any | null> => {
  const electronAPI = getElectronAPI();
  if (!electronAPI) {
    return null;
  }

  try {
    return await electronAPI.system.getInfo();
  } catch (error) {
    console.error('Error getting system info:', error);
    return null;
  }
};

// Type declarations for window.electronAPI
declare global {
  interface Window {
    electronAPI?: {
      vst: {
        scanPlugins: (directories: string[]) => Promise<any[]>;
        loadPlugin: (pluginPath: string) => Promise<any>;
        unloadPlugin: (instanceId: string) => Promise<any>;
        processAudio: (instanceId: string, audioData: ArrayBuffer) => Promise<any>;
      };
      autoMaster: (requestData: any) => Promise<any>;
      files: {
        showSaveDialog: (options: any) => Promise<{ canceled: boolean; filePath?: string }>;
        showOpenDialog: (options: any) => Promise<{ canceled: boolean; filePaths?: string[] }>;
        readEuphFile: (filePath: string) => Promise<{ success: boolean; data?: ArrayBuffer; error?: string }>;
        writeEuphFile: (filePath: string, data: ArrayBuffer) => Promise<{ success: boolean; error?: string }>;
      };
      wasm: {
        loadModule: (modulePath: string) => Promise<{ success: boolean; data?: ArrayBuffer; error?: string }>;
      };
      audio: {
        getDevices: () => Promise<{ inputs: any[]; outputs: any[] }>;
      };
      system: {
        getInfo: () => Promise<any>;
      };
      on: (channel: string, callback: (...args: any[]) => void) => void;
      removeListener: (channel: string, callback: (...args: any[]) => void) => void;
    };
    process?: {
      type: string;
    };
  }
}

export default {
  isElectron,
  getElectronAPI,
  readEuphFile,
  writeEuphFile,
  loadWasmModule,
  getAudioDevices,
  showOpenDialog,
  showSaveDialog,
  getSystemInfo,
};
