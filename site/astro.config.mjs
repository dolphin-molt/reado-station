// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://dolphin-molt.github.io',
  base: '/reado-station',
  build: {
    format: 'directory',
  },
  vite: {
    build: {
      rollupOptions: {
        // Allow importing from parent data dir
        external: [],
      },
    },
  },
});
