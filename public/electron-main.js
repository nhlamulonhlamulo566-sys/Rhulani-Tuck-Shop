const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const isDev = require('electron-is-dev');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let nextServer;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../.next/server/app.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Check for updates
  autoUpdater.checkForUpdatesAndNotify();
};

const startNextServer = () => {
  if (isDev) {
    // In development, Next.js dev server is already running
    return;
  }

  // Start Next.js server in production
  const nextPath = path.join(__dirname, '../.next/standalone/server.js');
  nextServer = spawn('node', [nextPath], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  });
};

const startDatabase = () => {
  // Check if MySQL is running
  // If not, start it (assumes MySQL is installed)
  const mySQLPath = process.platform === 'win32'
    ? 'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqld.exe'
    : process.platform === 'darwin'
    ? '/usr/local/mysql/bin/mysqld'
    : '/usr/sbin/mysqld';

  if (fs.existsSync(mySQLPath)) {
    spawn(mySQLPath, ['--skip-grant-tables'], {
      detached: true,
      stdio: 'ignore',
    }).unref();
  }
};

app.on('ready', () => {
  startDatabase();
  startNextServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
  if (nextServer) {
    nextServer.kill();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC handlers for app communication
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('check-for-updates', async () => {
  const result = await autoUpdater.checkForUpdates();
  return result;
});

// Create application menu
const createMenu = () => {
  const template = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            // Show about dialog
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

app.whenReady().then(createMenu);
