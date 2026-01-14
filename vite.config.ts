import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import type { UserConfig } from 'vite';
import type { InlineConfig } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface VitestConfigExport extends UserConfig {
  test: InlineConfig;
}

export default defineConfig(({ mode }): VitestConfigExport => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
  };
});
