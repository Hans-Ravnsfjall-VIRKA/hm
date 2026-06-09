import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' keeps asset paths relative so the build works at any GitHub Pages
// sub-path (e.g. https://<user>.github.io/virka-tippi/). HashRouter handles
// client routing without server config.
export default defineConfig({
  plugins: [react()],
  base: './',
});
