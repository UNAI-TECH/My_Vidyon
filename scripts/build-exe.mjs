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
  const distDir = path.join(__dirname, 'dist');
  const { port } = await startServer(distDir);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    title: 'MY VIDYON',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(\`http://127.0.0.1:\${port}\`)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.loadURL(\`http://127.0.0.1:\${port}\`);
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
