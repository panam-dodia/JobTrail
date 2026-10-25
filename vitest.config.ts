import { defineConfig } from 'vitest/config';

// Kept separate from vite.config.ts so tests don't load the extension build plugin.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
