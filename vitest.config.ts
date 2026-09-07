import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules", ".next"],
    // Keep test output clean
    reporters: ["verbose"],
    // Run tests in a single fork to keep things deterministic
    fileParallelism: false,
  },
});
