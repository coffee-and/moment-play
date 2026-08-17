import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { configDefaults } from 'vitest/config';

const isGitHubPagesBuild = process.env.GITHUB_PAGES === 'true';

export default defineConfig({
  base: isGitHubPagesBuild ? '/moment-play/' : '/',
  plugins: [react()],
  test: {
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
  },
  server: {
    host: '127.0.0.1',
    port: 3000,
  },
});
