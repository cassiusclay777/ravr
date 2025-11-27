const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

let mainWindow;

// Povolené audio formáty
const AUDIO_EXTENSIONS = new Set([
  '.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.wma', '.aiff'
]);

async function findAudioFiles(dir) {
  let results = [];
  try {
    const files = await readdir(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const fileStat = await stat(fullPath);
      
      if (fileStat.isDirectory()) {
        // Rekurzivně prohledáme podsložky
        results = results.concat(await findAudioFiles(fullPath));
      } else {
        // Kontrola přípony souboru
        const ext = path.extname(file).toLowerCase();
        if (AUDIO_EXTENSIONS.has(ext)) {
          results.push({
            path: fullPath,
            name: path.basename(file, ext),
            ext: ext.substring(1) // odstranění tečky
          });
        }
      }
    }
  } catch (error) {
    console.error(`Chyba při prohledávání složky ${dir}:`, error);
  }
  return results;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Načteme React aplikaci
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC handlery
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'multiSelections']
  });
  
  if (result.canceled) return [];
  
  let allFiles = [];
  for (const dir of result.filePaths) {
    const files = await findAudioFiles(dir);
    allFiles = allFiles.concat(files);
  }
  
  return allFiles;
});

ipcMain.handle('search-audio-files', async (event, startPath) => {
  return await findAudioFiles(startPath);
});
