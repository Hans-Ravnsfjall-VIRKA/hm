import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { writeFileSync, readFileSync } from 'node:fs';

// One version string per build. Stamped into the bundle (__APP_VERSION__) and
// written to dist/version.json, so the running app can notice a newer deploy.
const APP_VERSION = String(Date.now());
const APP_VERSION_NAME = JSON.parse(readFileSync('./package.json', 'utf8')).version || '1.0.0';

// Emit version.json into the build output for the in-app update check.
function emitVersion() {
  return {
    name: 'emit-version',
    writeBundle(options) {
      const dir = options.dir || 'dist';
      writeFileSync(`${dir}/version.json`, JSON.stringify({ version: APP_VERSION }));
    },
  };
}

// base './' keeps asset paths relative so the build works at any GitHub Pages
// sub-path (e.g. https://<user>.github.io/hm/). HashRouter handles client
// routing without server config.
export default defineConfig({
  plugins: [react(), emitVersion()],
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __APP_VERSION_NAME__: JSON.stringify(APP_VERSION_NAME),
  },
});
