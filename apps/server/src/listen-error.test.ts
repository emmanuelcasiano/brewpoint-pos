import { describe, expect, it } from 'vitest';
import { describeListenError } from './listen-error';

function systemError(code: string): Error {
  return Object.assign(new Error(`listen ${code}`), { code });
}

describe('describeListenError', () => {
  it('says which port is taken and what to change', () => {
    expect(describeListenError(systemError('EADDRINUSE'), '127.0.0.1', 3000)).toBe(
      'Port 3000 is already in use, so the server cannot start. Stop the other program using it, or set a different SERVER_PORT in .env.',
    );
  });

  it('explains a port the server may not use', () => {
    expect(describeListenError(systemError('EACCES'), '127.0.0.1', 80)).toContain(
      'not allowed to use port 80',
    );
  });

  it('explains a host that is not on this machine', () => {
    expect(describeListenError(systemError('EADDRNOTAVAIL'), '10.9.9.9', 3000)).toContain(
      'SERVER_HOST 10.9.9.9 is not an address on this machine',
    );
  });

  it('falls back to the original reason', () => {
    expect(describeListenError(new Error('something odd'), '127.0.0.1', 3000)).toBe(
      'The server could not start: something odd',
    );
  });
});
