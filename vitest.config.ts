import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**/*.d.ts',
        'dist/',
        'build/',
        'coverage/',
        'src-rust/',
        'electron/',
        'public/',
        '**/*.config.*',
        'src/components/**/*.stories.*',
        'src/types/'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    },
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/web': path.resolve(__dirname, './src/web'),
      '@/shared': path.resolve(__dirname, './src/shared'),
      '@/core': path.resolve(__dirname, './src/core'),
      '@/ai': path.resolve(__dirname, './src/ai'),
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/web': path.resolve(__dirname, './src/web'),
      '@/shared': path.resolve(__dirname, './src/shared'),
      '@/core': path.resolve(__dirname, './src/core'),
      '@/ai': path.resolve(__dirname, './src/ai'),
    }
  }
});
