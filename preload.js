const { contextBridge, ipcRenderer } = require("electron");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  // VST operations
  vst: {
    scanPlugins: (directories) =>
      ipcRenderer.invoke("vst-scan-plugins", directories),
    loadPlugin: (pluginPath) =>
      ipcRenderer.invoke("vst-load-plugin", pluginPath),
    unloadPlugin: (instanceId) =>
      ipcRenderer.invoke("vst-unload-plugin", instanceId),
    processAudio: (instanceId, audioData) =>
      ipcRenderer.invoke("vst-process-audio", instanceId, audioData),
  },

  // Auto-mastering
  autoMaster: (requestData) => ipcRenderer.invoke("auto-master", requestData),

  // File operations
  files: {
    showSaveDialog: (options) =>
      ipcRenderer.invoke("show-save-dialog", options),
    showOpenDialog: (options) =>
      ipcRenderer.invoke("show-open-dialog", options),
    readEuphFile: (filePath) =>
      ipcRenderer.invoke("read-euph-file", filePath),
    writeEuphFile: (filePath, data) =>
      ipcRenderer.invoke("write-euph-file", filePath, data),
  },

  // WASM support
  wasm: {
    loadModule: (modulePath) =>
      ipcRenderer.invoke("load-wasm-module", modulePath),
  },

  // Audio system
  audio: {
    getDevices: () => ipcRenderer.invoke("get-audio-devices"),
  },

  // System info
  system: {
    getInfo: () => ipcRenderer.invoke("get-system-info"),
  },

  // Event listeners
  on: (channel, callback) => {
    const validChannels = [
      "file-opened",
      "import-project",
      "export-audio",
      "audio-toggle-play",
      "audio-stop",
      "scan-vst-plugins",
    ];

    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    }
  },

  removeListener: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  },
});
