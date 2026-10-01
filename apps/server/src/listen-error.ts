/** Turns a failed `listen` into a plain message that says what to change. */
export function describeListenError(error: unknown, host: string, port: number): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;

  switch (code) {
    case 'EADDRINUSE':
      return `Port ${port} is already in use, so the server cannot start. Stop the other program using it, or set a different SERVER_PORT in .env.`;
    case 'EACCES':
      return `The server is not allowed to use port ${port}. Set SERVER_PORT in .env to a port above 1023, like 3000.`;
    case 'EADDRNOTAVAIL':
      return `SERVER_HOST ${host} is not an address on this machine. Use 127.0.0.1 for local development.`;
    default: {
      const reason = error instanceof Error ? error.message : String(error);
      return `The server could not start: ${reason}`;
    }
  }
}
