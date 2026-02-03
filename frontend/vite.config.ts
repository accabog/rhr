import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';

const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:8000';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
      },
      '/media': {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          antd: ['antd', '@ant-design/icons'],
          tanstack: ['@tanstack/react-query'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: ['**/node_modules/**', '**/e2e/**'],
    coverage: {
      // Coverage thresholds - increase incrementally as tests are added
      // Current baseline: lines=25, functions=45, branches=20, statements=25
      // Target: lines=50, functions=55, branches=40, statements=50
      thresholds: {
        lines: 35,
        functions: 50,
        branches: 30,
        statements: 35,
      },
    },
  },
});
