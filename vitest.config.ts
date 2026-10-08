import { defineConfig } from "vitest/config";

export default defineConfig({
  // Settings shows the version; vite.config.ts sets it for the real build.
  define: { __APP_VERSION__: JSON.stringify("test") },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    testTimeout: 30_000,
    environment: "jsdom",
  },
});
