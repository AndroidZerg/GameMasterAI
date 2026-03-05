import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createServer } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
process.chdir(__dirname);

const server = await createServer({
  root: __dirname,
  server: { port: 3100, host: true }
});
await server.listen();
server.printUrls();

// Keep process alive
process.stdin.resume();
