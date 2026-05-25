import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/application/**', 'src/domain/**', 'src/infrastructure/http/**'],
      exclude: ['src/infrastructure/server.ts'],
    },
  },
});
