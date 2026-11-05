import { createServer, type Server } from 'node:net';

import { afterEach, describe, expect, it } from 'vitest';

import { busyPortsMessage, portsInUse } from './ports';

let server: Server | undefined;

afterEach(async () => {
  await new Promise<void>((done) => (server ? server.close(() => done()) : done()));
  server = undefined;
});

function listen(): Promise<number> {
  return new Promise((done) => {
    server = createServer().listen(0, '127.0.0.1', () => {
      const address = server!.address();
      done(typeof address === 'object' && address ? address.port : 0);
    });
  });
}

describe('portsInUse', () => {
  it('finds a listening port and skips a free one', async () => {
    const busy = await listen();
    const free = await new Promise<number>((done) => {
      const probe = createServer().listen(0, '127.0.0.1', () => {
        const address = probe.address();
        const port = typeof address === 'object' && address ? address.port : 0;
        probe.close(() => done(port));
      });
    });
    expect(portsInUse([busy, free])).toEqual([busy]);
  });

  it('says how to get out of it', () => {
    expect(busyPortsMessage([3000, 3001])).toMatch(/3000 and 3001.*pnpm e2e:stop.*E2E_REUSE=1/);
  });
});
