// ============================================================
// File: electron/main.js
// Purpose: Electron main process for My Vidyon Desktop App.
//          Serves the Expo web bundle via a local HTTP server,
//          manages System Tray, and bridges native Windows toasts.
// ============================================================

const { 
  app, 
  BrowserWindow, 
  shell, 
  session, 
  Tray, 
  Menu, 
  nativeImage, 
  ipcMain, 
  Notification: ElectronNotification 
} = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

// Ensure Single Instance Lock: prevents duplicate background processes
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

// Set Application User Model ID for Windows Toast Notifications.
// Windows 10/11 REQUIRES this for notifications to appear in the Action Center.
if (process.platform === 'win32') {
  app.setAppUserModelId('com.myvidyon.app');
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.map': 'application/json',
};

let httpServer = null;

function startServer(distDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const parsedUrl = new URL(req.url, 'http://127.0.0.1');
        let decodedPath = decodeURIComponent(parsedUrl.pathname);
        let safePath = path.normalize(decodedPath).replace(/^(\.\.[\\/])+/, '');
        let filePath = path.join(distDir, safePath);

        fs.stat(filePath, (err, stats) => {
          if (!err && stats.isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            const contentType = mimeTypes[ext] || 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': contentType });
            fs.createReadStream(filePath).pipe(res);
          } else {
            // SPA fallback: serve index.html for all unknown routes
            const indexPath = path.join(distDir, 'index.html');
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            fs.createReadStream(indexPath).pipe(res);
          }
        });
      } catch (e) {
        res.writeHead(500);
        res.end(e.message);
      }
    });

    const FIXED_PORT = 58291;
    server.listen(FIXED_PORT, '127.0.0.1', () => {
      httpServer = server;
      resolve({ port: FIXED_PORT, server });
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        const fallback = http.createServer(server.listeners('request')[0]);
        fallback.listen(0, '127.0.0.1', () => {
          httpServer = fallback;
          resolve({ port: fallback.address().port, server: fallback });
        });
      } else {
        reject(err);
      }
    });
  });
}

let mainWindow = null;
let tray = null;
let isQuitting = false;

function createTray() {
  const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
  let trayImage;

  if (fs.existsSync(iconPath)) {
    trayImage = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  } else {
    trayImage = nativeImage.createEmpty();
  }

  tray = new Tray(trayImage);
  tray.setToolTip('My Vidyon - Institution Portal');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open My Vidyon',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Native Windows Toast IPC Bridge
ipcMain.on('show-native-toast', (event, { title, body }) => {
  try {
    if (ElectronNotification.isSupported()) {
      const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
      const notif = new ElectronNotification({
        title: title || 'My Vidyon',
        body: body || '',
        icon: fs.existsSync(iconPath) ? iconPath : undefined,
        urgency: 'critical',
        sound: true,
        silent: false,
      });

      notif.on('click', () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        }
      });

      notif.show();
    }
  } catch (err) {
    console.error('[Electron Main] Native toast error:', err);
  }
});

// App instance handling
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

app.whenReady().then(async () => {
  // Automatically grant notification permissions for Web Notification API in Electron
  if (session.defaultSession) {
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      if (permission === 'notifications') {
        callback(true);
        return;
      }
      callback(true);
    });
  }

  // The dist folder is bundled alongside this main.js by electron-builder
  const distDir = path.join(__dirname, '..', 'dist');

  const { port } = await startServer(distDir);
  const targetUrl = `http://127.0.0.1:${port}`;

  const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 900,
    minHeight: 600,
    title: 'My Vidyon',
    autoHideMenuBar: true,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Minimize-to-tray on window close instead of terminating the app
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

  // Create the persistent System Tray icon
  createTray();

  // Enable F12 and Ctrl+Shift+I to toggle DevTools, and F5 / Ctrl+R to reload
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
    if (input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r')) {
      mainWindow.webContents.reload();
      event.preventDefault();
    }
  });

  // Open external links in the system browser, not inside the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://127.0.0.1') || url.startsWith('http://localhost')) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.loadURL(targetUrl);
});

app.on('before-quit', () => {
  isQuitting = true;
  if (httpServer) {
    try {
      httpServer.close();
    } catch (_) {}
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && isQuitting) {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});
