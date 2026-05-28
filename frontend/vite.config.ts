import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: '../celadon/static',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'index.html',
        login: 'login.html',
      },
    },
  },
});
