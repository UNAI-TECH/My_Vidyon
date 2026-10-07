import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const exeAppDir = path.join(rootDir, 'MyVidyon-win32-x64', 'resources', 'app');
const targetDistDir = path.join(exeAppDir, 'dist');

console.log('🚀 Step 1: Exporting Expo web bundle...');
execSync('npx expo export -p web', { stdio: 'inherit', cwd: rootDir });

console.log('📦 Step 2: Copying web bundle into desktop app...');
if (fs.existsSync(targetDistDir)) {
  fs.rmSync(targetDistDir, { recursive: true, force: true });
}
fs.cpSync(distDir, targetDistDir, { recursive: true });

console.log('⚙️ Step 3: Setting up desktop runner...');
const indexJsContent = `const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

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
  '.map': 'application/json'
};

function checkLiveDevServer(urlStr) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(urlStr);
      const req = http.request(
        {
          hostname: parsed.hostname,
          port: parsed.port || 80,
          path: '/',
          method: 'GET',
          timeout: 1200,
        },
        () => resolve(true)
      );
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      req.end();
    } catch {
      resolve(false);
    }
  });
}

function startServer(distDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const parsedUrl = new URL(req.url, 'http://127.0.0.1');
        let decodedPath = decodeURIComponent(parsedUrl.pathname);
        let safePath = path.normalize(decodedPath).replace(/^(\\.\\.[\\/\\\\])+/, '');
        let filePath = path.join(distDir, safePath);

        fs.stat(filePath, (err, stats) => {
          if (!err && stats.isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            const contentType = mimeTypes[ext] || 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': contentType });
            fs.createReadStream(filePath).pipe(res);
          } else {
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

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ port, server });
    });

    server.on('error', reject);
  });
}

let mainWindow;

app.whenReady().then(async () => {
  const explicitArg = process.argv.find(arg => arg.startsWith('--url='));
  const explicitUrl = explicitArg ? explicitArg.split('=')[1] : (process.env.DEV_SERVER_URL || process.env.ELECTRON_START_URL);

  let targetUrl = null;
  let isDevMode = false;

  if (explicitUrl) {
    targetUrl = explicitUrl;
    isDevMode = true;
  } else {
    const is8081Alive = await checkLiveDevServer('http://127.0.0.1:8081');
    if (is8081Alive) {
      targetUrl = 'http://localhost:8081';
      isDevMode = true;
    }
  }

  if (!targetUrl) {
    const distDir = path.join(__dirname, 'dist');
    const { port } = await startServer(distDir);
    targetUrl = \`http://127.0.0.1:\${port}\`;
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    title: isDevMode ? 'MY VIDYON (Live Dev - Localhost)' : 'MY VIDYON',
    autoHideMenuBar: !isDevMode,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(targetUrl) || url.startsWith('http://localhost:8081') || url.startsWith('http://127.0.0.1')) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDevMode) {
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
  }

  mainWindow.loadURL(targetUrl);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
`;

fs.writeFileSync(path.join(exeAppDir, 'index.js'), indexJsContent, 'utf8');

const pkgPath = path.join(exeAppDir, 'package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.main = 'index.js';
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
}

console.log('\\n✅ Standalone Windows EXE is ready!');
console.log('👉 Location: MyVidyon-win32-x64\\\\MyVidyon.exe\\n');
