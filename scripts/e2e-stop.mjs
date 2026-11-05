// `pnpm e2e:stop`: stop whatever listens on 3000 and 3001. On Windows, dev servers can outlive the
// Playwright run that started them (docs/debugging.md), and local E2E refuses to reuse them.
import { execFileSync } from 'node:child_process';

const PORTS = [3000, 3001];

function listeningPids() {
  if (process.platform === 'win32') {
    const lines = execFileSync('netstat', ['-ano', '-p', 'tcp'], { encoding: 'utf8' }).split(
      /\r?\n/,
    );
    const pids = new Set();
    for (const line of lines) {
      const cols = line.trim().split(/\s+/);
      if (cols.length < 5 || cols[3] !== 'LISTENING') continue;
      const port = Number(cols[1].split(':').pop());
      if (PORTS.includes(port)) pids.add(cols[4]);
    }
    return [...pids];
  }
  const pids = new Set();
  for (const port of PORTS) {
    try {
      const out = execFileSync('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN'], {
        encoding: 'utf8',
      });
      for (const pid of out.split(/\s+/).filter(Boolean)) pids.add(pid);
    } catch {
      // lsof exits 1 when nothing listens.
    }
  }
  return [...pids];
}

const pids = listeningPids();
for (const pid of pids) {
  try {
    if (process.platform === 'win32') {
      execFileSync('taskkill', ['/PID', pid, '/T', '/F'], { stdio: 'ignore' });
    } else {
      process.kill(Number(pid), 'SIGTERM');
    }
  } catch {
    // Already gone.
  }
}
console.log(
  pids.length ? `Stopped ${pids.length} server(s) on 3000/3001.` : 'Nothing on 3000/3001.',
);
