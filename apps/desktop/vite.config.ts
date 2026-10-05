import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react(), {
    name: 'local-import-boundary',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if ((request.url?.startsWith('/engine/imports') || request.url?.startsWith('/engine/profile') || request.url?.startsWith('/engine/search') || request.url?.startsWith('/engine/providers') || request.url?.startsWith('/engine/assistance')) && request.headers['x-jobscout-import'] !== '1') {
          response.statusCode = 403;
          response.end();
          return;
        }
        next();
      });
    },
  }],
  clearScreen: false,
  server: {
    host: '127.0.0.1', port: 1420, strictPort: true,
    cors: false,
    // Rust build output contains locked DLLs while Tauri compiles. It is not
    // frontend source and must stay outside Vite's development file watcher.
    watch: { ignored: ['**/src-tauri/target/**', '**/src-tauri/binaries/**'] },
    proxy: process.env.JOBSCOUT_ENGINE_URL ? {
      // Expose only fixed local routes, never a general engine/network proxy.
      '^/engine/(health|profile|assistance|search(/(preview|plan|[0-9a-f-]{36}(/cancel)?))?|providers/tavily(/check)?|imports(/[0-9a-f-]{36}(/(pdf|docx))?)?)$': {
        target: process.env.JOBSCOUT_ENGINE_URL,
        rewrite: path => path.replace(/^\/engine/, '/api/v1'),
        headers: { Authorization: `Bearer ${process.env.JOBSCOUT_SESSION_TOKEN}` },
      },
    } : undefined,
  },
});
