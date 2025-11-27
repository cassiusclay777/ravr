const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  Menu,
  shell,
  protocol,
} = require("electron");
const path = require("path");
const fs = require("fs");
const { promisify } = require("util");
const { exec } = require("child_process");

const isDev =
  process.env.NODE_ENV === "development" || process.env.ELECTRON_IS_DEV === "1";
const isPortable = process.env.PORTABLE_EXECUTABLE_DIR !== undefined;

// VST Host integration - DISABLED for security (buffer overflow fix)
let VSTHost = null;
console.log(
  "VST Host disabled for security reasons (buffer overflow prevention)"
);

let mainWindow;
let vstHost;
let splashWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, "preload.js"),
      webSecurity: true, // Always enable web security
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      sandbox: false, // Keep false for audio processing
    },
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    frame: true, // Ensure frame is visible on Windows
    backgroundColor: '#0a0d12', // Match app background
    show: false,
    icon: process.platform === 'win32'
      ? path.join(__dirname, "assets/icon.ico")
      : path.join(__dirname, "assets/icon.png"),
    autoHideMenuBar: false, // Show menu bar on Windows
  });

  // Load the app
  const loadDistFallback = () => {
    const filePath = path.join(__dirname, "dist/index.html");
    mainWindow.loadFile(filePath).catch((err) => {
      console.error("Failed to load dist/index.html:", err);
      dialog.showErrorBox(
        "Load Error",
        "Failed to load the application. Please reinstall the application."
      );
      app.quit();
    });
  };

  // Enable WASM support
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true);
    } else {
      callback(false);
    }
  });

  if (isDev) {
    const devUrl = process.env.ELECTRON_START_URL || "http://localhost:5175";
    // If dev server fails, fallback to built files if available
    mainWindow.webContents.on(
      "did-fail-load",
      (_event, errorCode, errorDescription, validatedURL) => {
        console.error("Dev server load failed:", {
          errorCode,
          errorDescription,
          validatedURL,
        });
        loadDistFallback();
      }
    );
    mainWindow.loadURL(devUrl).catch((err) => {
      console.error("loadURL error:", err);
      loadDistFallback();
    });
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from the Vite build output directory
    loadDistFallback();
  }

  // Show window when ready
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();

    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Initialize VST Host (guarded)
  try {
    if (VSTHost) {
      vstHost = new VSTHost();
    } else {
      console.log(
        "VSTHost module not available; continuing without VST integration."
      );
    }
  } catch (err) {
    console.warn("VSTHost initialization failed:", err);
  }
}

// App event handlers
app.whenReady().then(() => {
  createWindow();
  createMenu();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (vstHost) {
    vstHost.cleanup();
  }
});

// Menu setup
function createMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "Open Audio File",
          accelerator: "CmdOrCtrl+O",
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ["openFile"],
              filters: [
                {
                  name: "Audio Files",
                  extensions: ["mp3", "wav", "flac", "m4a", "ogg", "euph"],
                },
                { name: "All Files", extensions: ["*"] },
              ],
            });

            if (!result.canceled) {
              mainWindow.webContents.send("file-opened", result.filePaths[0]);
            }
          },
        },
        {
          label: "Import Project",
          accelerator: "CmdOrCtrl+I",
          click: () => {
            mainWindow.webContents.send("import-project");
          },
        },
        {
          label: "Export Audio",
          accelerator: "CmdOrCtrl+E",
          click: () => {
            mainWindow.webContents.send("export-audio");
          },
        },
        { type: "separator" },
        {
          label: "Exit",
          accelerator: process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q",
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
      ],
    },
    {
      label: "Audio",
      submenu: [
        {
          label: "Play/Pause",
          accelerator: "Space",
          click: () => {
            mainWindow.webContents.send("audio-toggle-play");
          },
        },
        {
          label: "Stop",
          accelerator: "Escape",
          click: () => {
            mainWindow.webContents.send("audio-stop");
          },
        },
        { type: "separator" },
        {
          label: "Scan VST Plugins",
          click: () => {
            mainWindow.webContents.send("scan-vst-plugins");
          },
        },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "close" }],
    },
  ];

  if (process.platform === "darwin") {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideothers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC handlers for VST integration
ipcMain.handle("vst-scan-plugins", async (_event, directories) => {
  try {
    return await vstHost.scanPlugins(directories);
  } catch (error) {
    console.error("VST scan failed:", error);
    return [];
  }
});

// Auto-mastering endpoint
ipcMain.handle("auto-master", async (_event, requestData) => {
  try {
    const { audioData, options } = requestData;

    // Import the auto-master service
    const { autoMasterService } = require("./dist/assets/js/autoMasterApi.js");

    // Process the audio through master_me
    const result = await autoMasterService.autoMaster({
      audioData: Buffer.from(audioData),
      options,
    });

    return result;
  } catch (error) {
    console.error("Auto-mastering failed:", error);
    return {
      success: false,
      error: error.message || "Auto-mastering failed",
    };
  }
});

ipcMain.handle("vst-load-plugin", async (_event, pluginPath) => {
  try {
    return await vstHost.loadPlugin(pluginPath);
  } catch (error) {
    console.error("VST load failed:", error);
    throw error;
  }
});

ipcMain.handle("vst-unload-plugin", async (_event, instanceId) => {
  try {
    return await vstHost.unloadPlugin(instanceId);
  } catch (error) {
    console.error("VST unload failed:", error);
    throw error;
  }
});

ipcMain.handle("vst-process-audio", async (event, instanceId, audioData) => {
  try {
    return await vstHost.processAudio(instanceId, audioData);
  } catch (error) {
    console.error("VST process failed:", error);
    throw error;
  }
});

// File system operations
ipcMain.handle("show-save-dialog", async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle("show-open-dialog", async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

// EUPH format support
ipcMain.handle("read-euph-file", async (event, filePath) => {
  try {
    const data = await fs.promises.readFile(filePath);
    return {
      success: true,
      data: data.buffer,
    };
  } catch (error) {
    console.error("Failed to read EUPH file:", error);
    return {
      success: false,
      error: error.message,
    };
  }
});

ipcMain.handle("write-euph-file", async (event, filePath, data) => {
  try {
    await fs.promises.writeFile(filePath, Buffer.from(data));
    return {
      success: true,
    };
  } catch (error) {
    console.error("Failed to write EUPH file:", error);
    return {
      success: false,
      error: error.message,
    };
  }
});

// WASM module loading support
ipcMain.handle("load-wasm-module", async (event, modulePath) => {
  try {
    const wasmPath = path.join(__dirname, "dist", modulePath);
    const wasmBuffer = await fs.promises.readFile(wasmPath);
    return {
      success: true,
      data: wasmBuffer.buffer,
    };
  } catch (error) {
    console.error("Failed to load WASM module:", error);
    return {
      success: false,
      error: error.message,
    };
  }
});

// Audio device enumeration helper functions
const execAsync = promisify(exec);

const getWindowsAudioDevices = async () => {
  const devices = [];
  try {
    const { stdout } = await execAsync("wmic sounddev get name /format:csv");
    const lines = stdout.split("\n").filter((line) => line.includes(","));
    lines.forEach((line) => {
      const name = line.split(",")[1]?.trim();
      if (name && name !== "Name") {
        devices.push({
          id: `win32-${Buffer.from(name).toString("base64")}`,
          name: name,
          kind: "audiooutput",
        });
      }
    });
  } catch (wmicError) {
    console.warn("WMIC audio enumeration failed:", wmicError.message);
    // Fallback to common Windows audio devices
    devices.push(
      {
        id: "win32-default",
        name: "Default Audio Device",
        kind: "audiooutput",
      },
      { id: "win32-speakers", name: "Speakers", kind: "audiooutput" }
    );
  }
  return devices;
};

const getMacOSAudioDevices = async () => {
  const devices = [];
  try {
    const { stdout } = await execAsync("system_profiler SPAudioDataType -json");
    const audioData = JSON.parse(stdout);
    if (audioData.SPAudioDataType) {
      audioData.SPAudioDataType.forEach((device) => {
        if (device._name) {
          devices.push({
            id: `darwin-${Buffer.from(device._name).toString("base64")}`,
            name: device._name,
            kind: "audiooutput",
          });
        }
      });
    }
  } catch (macError) {
    console.warn("macOS audio enumeration failed:", macError.message);
    // Fallback to common macOS audio devices
    devices.push(
      {
        id: "darwin-default",
        name: "Default Audio Device",
        kind: "audiooutput",
      },
      { id: "darwin-builtin", name: "Built-in Output", kind: "audiooutput" }
    );
  }
  return devices;
};

const getLinuxAudioDevices = async () => {
  const devices = [];
  try {
    // Try PulseAudio first
    const { stdout } = await execAsync("pactl list short sinks");
    const lines = stdout.split("\n").filter((line) => line.trim());
    lines.forEach((line) => {
      const parts = line.split("\t");
      if (parts.length >= 2) {
        devices.push({
          id: `linux-${parts[0]}`,
          name: parts[1] || `Audio Device ${parts[0]}`,
          kind: "audiooutput",
        });
      }
    });
  } catch (pulseError) {
    try {
      // Fallback to ALSA
      const { stdout } = await execAsync("aplay -l");
      const lines = stdout.split("\n").filter((line) => line.includes("card"));
      lines.forEach((line) => {
        const match = line.match(/card (\d+): (.+?),/);
        if (match) {
          devices.push({
            id: `linux-alsa-${match[1]}`,
            name: match[2].trim(),
            kind: "audiooutput",
          });
        }
      });
    } catch (alsaError) {
      console.warn("Linux audio enumeration failed:", alsaError.message);
      // Fallback to default Linux audio device
      devices.push({
        id: "linux-default",
        name: "Default Audio Device",
        kind: "audiooutput",
      });
    }
  }
  return devices;
};

// Audio device enumeration
ipcMain.handle("get-audio-devices", async () => {
  try {
    // Native audio device enumeration using Node.js
    const devices = {
      inputs: [],
      outputs: [],
    };

    // Platform-specific audio device detection
    if (process.platform === "win32") {
      devices.outputs = await getWindowsAudioDevices();
    } else if (process.platform === "darwin") {
      devices.outputs = await getMacOSAudioDevices();
    } else if (process.platform === "linux") {
      devices.outputs = await getLinuxAudioDevices();
    } else {
      // Fallback for other platforms
      devices.outputs.push({
        id: "generic-default",
        name: "Default Audio Device",
        kind: "audiooutput",
      });
    }

    // Add default device if no devices found
    if (devices.outputs.length === 0) {
      devices.outputs.push({
        id: "fallback-default",
        name: "Default Audio Device",
        kind: "audiooutput",
      });
    }

    return devices;
  } catch (error) {
    console.error("Failed to get audio devices:", error);
    return {
      inputs: [],
      outputs: [
        {
          id: "error-fallback",
          name: "Default Audio Device",
          kind: "audiooutput",
        },
      ],
    };
  }
});

// Performance monitoring
ipcMain.handle("get-system-info", async () => {
  const os = require("os");
  return {
    platform: process.platform,
    arch: process.arch,
    cpus: os.cpus(),
    memory: {
      total: os.totalmem(),
      free: os.freemem(),
    },
    version: process.version,
  };
});

// Error handling
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
