import { spawn } from 'node:child_process';

const nextPort = process.env.PLAYWRIGHT_PORT || '4173';
const mockBackendPort = process.env.MOCK_BACKEND_PORT || '5187';

const children = [];
let shuttingDown = false;

function start(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: false,
    ...options,
  });
  children.push(child);
  child.on('exit', (code, signal) => {
    if (!shuttingDown && code !== 0) {
      process.stderr.write(`${command} exited with ${code ?? signal}\n`);
      shutdown(code ?? 1);
    }
  });
  return child;
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(code), 500).unref();
}

process.on('SIGINT', () => shutdown(130));
process.on('SIGTERM', () => shutdown(143));

start(process.execPath, ['e2e/mock-backend.mjs'], {
  env: { ...process.env, MOCK_BACKEND_PORT: mockBackendPort },
});

start('npm', ['run', 'dev', '--', '--hostname', '127.0.0.1', '--port', nextPort], {
  env: {
    ...process.env,
    BACKEND_INTERNAL_URL: `http://127.0.0.1:${mockBackendPort}`,
  },
});
