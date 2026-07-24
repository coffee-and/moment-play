import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const isGitHubPagesBuild = process.env.GITHUB_PAGES === 'true';

export default defineConfig({
  base: isGitHubPagesBuild ? '/moment-play/' : '/',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 3000,
  },
});
