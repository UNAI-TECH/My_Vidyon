const { app, BrowserWindow, shell, nativeImage } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

/**
 * 1. IDENTITY FIRST
 * We must set the application identity (Name and ID) BEFORE requesting the 
 * single instance lock. This ensures Windows groups all instances correctly.
 */
app.name = "My Vidyon";
if (app.setName) app.setName("My Vidyon");

// Set AppUserModelId for Windows early to fix taskbar branding and grouping
if (process.platform === 'win32') {
  app.setAppUserModelId("com.myvidyon.desktop");
}

/**
 * 2. SINGLE INSTANCE LOCK
 * Only one instance of My Vidyon should run at a time.
 */
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // If we can't get the lock, it means another instance is already running.
  // We terminate immediately to prevent port conflicts (EADDRINUSE) and duplicate UI.
  process.exit(0);
}

/**
 * 3. PRIMARY INSTANCE SETUP
 * If we are here, we are the only running instance.
 */

// Decide which icon to use based on platform
const ICON_FILE = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
const ICON_PATH = path.join(__dirname, 'assets', ICON_FILE);
const FALLBACK_ICON_PATH = path.join(__dirname, 'assets', 'icon.png');

// Load the app icon as a NativeImage
let appIcon = nativeImage.createFromPath(ICON_PATH);
if (appIcon.isEmpty() && process.platform === 'win32') {
  // Fallback to PNG if ICO is somehow missing or invalid
  appIcon = nativeImage.createFromPath(FALLBACK_ICON_PATH);
}

let mainWindow;
const PORT = 38475; // Arbitrary safe port
const DIST_DIR = path.join(__dirname, 'dist');

function startLocalServer() {
  const server = http.createServer((req, res) => {
    const rawUrl = req.url.split('?')[0];
    let filePath = path.join(DIST_DIR, rawUrl === '/' ? 'index.html' : rawUrl);
    
    if (!filePath.startsWith(DIST_DIR)) {
      res.writeHead(403);
      return res.end('403 Forbidden');
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST_DIR, 'index.html');
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
      '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpg',
      '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
      '.woff': 'application/font-woff', '.woff2': 'font/woff2', '.ttf': 'application/font-ttf'
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
      if (error) {
        res.writeHead(500);
        res.end('Server Error: ' + error.code);
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });

  });

  server.on('error', (err) => {
    console.error('Local server encountered an error:', err);
  });

  server.listen(PORT, '127.0.0.1');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    resizable: true,
    maximizable: true,
    title: "My Vidyon Desktop",
    backgroundColor: '#ffffff',
    icon: appIcon,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.autoHideMenuBar = true;

  setTimeout(() => {
    mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
  }, 100);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        title: "My Vidyon - Document Preview",
        backgroundColor: '#ffffff',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      }
    };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// APP INITIALIZATION
app.whenReady().then(() => {
  startLocalServer();
  createWindow();

  // Ensure ALL windows (including popups) use the app icon and hide menus
  app.on('browser-window-created', (event, window) => {
    window.setMenuBarVisibility(false);
    window.autoHideMenuBar = true;
    window.setIcon(appIcon);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Handle secondary launch attempts by focusing existing instance
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
