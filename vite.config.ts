import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {fileURLToPath} from 'node:url';
import {defineConfig, loadEnv} from 'vite';

/** Directory containing this vite.config.ts — always use as Vite root (avoids serving another cwd). */
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, projectRoot, '');
  return {
    root: projectRoot,
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': projectRoot,
      },
    },
    server: {
      /** Single Vite dev server: landing + app + auth are all client routes on this port. */
      port: 5173,
      /** Fail fast if 5173 is taken instead of silently picking another port (e.g. 3000). */
      strictPort: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    preview: {
      port: 5173,
      strictPort: true,
      host: true,
    },
  };
});
