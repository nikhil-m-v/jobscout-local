import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    host: '127.0.0.1', port: 1420, strictPort: true,
    // Rust build output contains locked DLLs while Tauri compiles. It is not
    // frontend source and must stay outside Vite's development file watcher.
    watch: { ignored: ['**/src-tauri/target/**', '**/src-tauri/binaries/**'] },
    proxy: process.env.JOBSCOUT_ENGINE_URL ? {
      // Only the health route is exposed in the development preview.
      '/engine/health': {
        target: process.env.JOBSCOUT_ENGINE_URL,
        rewrite: () => '/api/v1/health',
        headers: { Authorization: `Bearer ${process.env.JOBSCOUT_SESSION_TOKEN}` },
      },
    } : undefined,
  },
});
