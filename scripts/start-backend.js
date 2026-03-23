/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Start the Flask backend from project root (cross-platform).
 * Uses backend/ as cwd so imports and .env work.
 * Starts both the chat and medical services used by the Next.js app.
 */
const path = require('path');
const { spawn } = require('child_process');

const backendDir = path.join(__dirname, '..', 'backend');
const scripts = [
  { label: 'chat', script: path.join(backendDir, 'app.py') },
  { label: 'medical', script: path.join(backendDir, 'app_api.py') },
];

// Windows: "python"; Unix: "python3"
const cmd = process.platform === 'win32' ? 'python' : 'python3';

let shuttingDown = false;
const children = scripts.map(({ label, script }) => {
  const childEnv = {
    ...process.env,
  };

  if (!process.env.BACKEND_INTERNAL_API_KEY) {
    delete childEnv.BACKEND_INTERNAL_API_KEY;
  }

  const child = spawn(cmd, [script], {
    cwd: backendDir,
    stdio: 'inherit',
    env: childEnv,
  });

  child.on('error', (err) => {
    console.error(`[start-backend] Failed to start ${label} backend:`, err.message);
    console.error('Install Python and ensure it is in PATH (Windows: run "py" or add Python to PATH).');
    if (!shuttingDown) {
      shuttingDown = true;
      for (const otherChild of children) {
        if (!otherChild.killed) {
          otherChild.kill('SIGTERM');
        }
      }
      process.exit(1);
    }
  });

  return child;
});

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

let remainingChildren = children.length;
for (const child of children) {
  child.on('exit', (code, signal) => {
    remainingChildren -= 1;

    if (!shuttingDown && code && code !== 0) {
      shuttingDown = true;
      for (const otherChild of children) {
        if (otherChild !== child && !otherChild.killed) {
          otherChild.kill('SIGTERM');
        }
      }
      process.exit(code);
    }

    if (remainingChildren === 0) {
      if (signal) {
        process.exit(0);
      }
      process.exit(code ?? 0);
    }
  });
}
