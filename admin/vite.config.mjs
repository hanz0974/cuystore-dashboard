import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';
import { createBotApi } from './bot-api.mjs';

export default defineConfig(() => {
  const env = { ...loadEnv('', fileURLToPath(new URL('../', import.meta.url)), ''), ...process.env };
  const handler = createBotApi({ env });
  return {
    // No secret is exposed as a VITE_* client environment variable.
    server: { host: '127.0.0.1' },
    preview: { host: '127.0.0.1' },
    plugins: [{ name: 'cuystore-local-bot-api', configureServer(server) { server.middlewares.use(handler); }, configurePreviewServer(server) { server.middlewares.use(handler); } }],
  };
});
