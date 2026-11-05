// Playwright starts its web servers before globalSetup, so the config itself must check, before
// anything starts, whether a server is already on 3000 or 3001. That server may be `pnpm dev` on
// the dev database. The config is synchronous, so a short child process does the connect test.
import { execFileSync } from 'node:child_process';

const PROBE = `
const net = require('node:net');
const ports = JSON.parse(process.argv[1]);
Promise.all(ports.map((port) => new Promise((done) => {
  const socket = net.connect({ port, host: '127.0.0.1' });
  socket.setTimeout(1000);
  socket.once('connect', () => { socket.destroy(); done(port); });
  socket.once('timeout', () => { socket.destroy(); done(null); });
  socket.once('error', () => done(null));
}))).then((found) => process.stdout.write(JSON.stringify(found.filter((p) => p !== null))));
`;

export function portsInUse(ports: number[]): number[] {
  const output = execFileSync(process.execPath, ['-e', PROBE, JSON.stringify(ports)], {
    encoding: 'utf8',
  });
  return JSON.parse(output) as number[];
}

export function busyPortsMessage(ports: number[]): string {
  return [
    `Port ${ports.join(' and ')} is already in use.`,
    'That server may be `pnpm dev` on the dev database, so E2E won’t reuse it.',
    'Run `pnpm e2e:stop`, or set E2E_REUSE=1 if it is a server left by an earlier E2E run.',
  ].join(' ');
}
