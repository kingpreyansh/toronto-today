import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // The shadcn registry components import "@/lib/utils".
    alias: { '@': path.resolve(process.cwd(), 'src') },
  },
  server: { host: '127.0.0.1', proxy: { '/data': 'http://127.0.0.1:8780' } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
    restoreMocks: true,
  },
});
