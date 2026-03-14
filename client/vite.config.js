import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': 'http://localhost:3001',
      '/loans': 'http://localhost:3001',
      '/credit': 'http://localhost:3001',
      '/health': 'http://localhost:3001',
      '/notifications': 'http://localhost:3001',
      '/analytics': 'http://localhost:3001',
      '/profile': 'http://localhost:3001',
    },
  },
});
