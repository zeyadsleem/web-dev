import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['tests/**/*.test.ts'] },
  resolve: { alias: { $lib: new URL('./src/lib', import.meta.url).pathname } },
});
