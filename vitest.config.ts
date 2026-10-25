import { defineConfig } from 'vitest/config';

export default defineConfig({
  // many suites run Larkspur mini or a simulator over every case; 5 s per test is too tight once they share the CPU
  test: { environment: 'node', include: ['tests/unit/**/*.test.ts', 'src/**/*.test.ts'], testTimeout: 60_000 },
});
