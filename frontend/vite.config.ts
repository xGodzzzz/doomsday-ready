import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const frontendDirectory = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => {
  const frontendEnv = loadEnv(mode, frontendDirectory, '');
  // Read PORT from the sibling backend/.env automatically when present.
  // BACKEND_PORT / BACKEND_URL in frontend/.env override it.
  const backendEnv = loadEnv(mode, resolve(frontendDirectory, '../backend'), '');
  const backendPort = frontendEnv.BACKEND_PORT || backendEnv.PORT || '3000';
  const backendTarget = frontendEnv.BACKEND_URL || `http://127.0.0.1:${backendPort}`;

  return {
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
