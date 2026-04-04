// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://reado.theopcapp.com',
  base: '/',
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
