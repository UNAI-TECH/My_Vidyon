// ============================================================
// File: scripts/dev-exe.mjs
// Purpose: Launches the Windows EXE connected directly to the
//          live localhost Expo dev server (fast-refresh, no rebuilding)
// ============================================================

import { spawn, exec } from 'child_process';
import http from 'http';
import path from 'path';
import fs from 'fs';

const rootDir = process.cwd();
const exePath = path.join(rootDir, 'MyVidyon-win32-x64', 'MyVidyon.exe');

if (!fs.existsSync(exePath)) {
  console.error('❌ Error: MyVidyon.exe not found at:', exePath);
  process.exit(1);
}

function isPortActive(port = 8081) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: '/',
        method: 'GET',
        timeout: 1000,
      },
      () => resolve(true)
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

async function waitForPort(port = 8081, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    if (await isPortActive(port)) return true;
    await new Promise((r) => setTimeout(r, 1000));
    process.stdout.write('.');
  }
  return false;
}

async function main() {
  console.log('🔍 Checking if Expo web dev server is running on localhost:8081...');
  const isAlreadyRunning = await isPortActive(8081);

  if (isAlreadyRunning) {
    console.log('✅ Found active Expo dev server at http://localhost:8081!');
  } else {
    console.log('⚡ Starting Expo web dev server (npx expo start --web)...');
    const expoProcess = spawn('npx', ['expo', 'start', '--web'], {
      cwd: rootDir,
      shell: true,
      stdio: 'inherit',
    });

    process.on('SIGINT', () => {
      expoProcess.kill('SIGINT');
      process.exit();
    });

    process.stdout.write('⏳ Waiting for localhost:8081 to come online');
    const isOnline = await waitForPort(8081);
    console.log('');

    if (!isOnline) {
      console.warn('⚠️ Dev server took longer than expected to report ready, launching EXE anyway...');
    }
  }

  console.log('🚀 Launching MyVidyon.exe connected to http://localhost:8081...');
  console.log('💡 TIP: Fast Refresh is active! Edit your code and the EXE updates instantly without rebuilding.');
  console.log('💡 TIP: Press F12 in the app to toggle DevTools, or Ctrl+R to reload.');

  const exeProcess = spawn(exePath, ['--url=http://localhost:8081'], {
    cwd: path.dirname(exePath),
    detached: true,
    stdio: 'ignore',
  });

  exeProcess.unref();
  console.log('🎉 EXE launched successfully!');
}

main().catch((err) => {
  console.error('Error starting dev:electron:', err);
  process.exit(1);
});
