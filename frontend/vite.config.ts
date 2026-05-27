import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        login: 'login.html',
      },
    },
  },
  server: {
    port: 9001,
    proxy: {
      '/customer': 'http://localhost:9002',
      '/sale': 'http://localhost:9002',
      '/purchaser': 'http://localhost:9002',
      '/purchase': 'http://localhost:9002',
      '/item': 'http://localhost:9002',
      '/auth': 'http://localhost:9002',
      '/login': 'http://localhost:9002',
      '/logout': 'http://localhost:9002',
    },
  },
});
