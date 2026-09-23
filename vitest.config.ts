import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * The application is built by the Lovable/Nitro Vite pipeline, which is not
 * suitable for driving unit tests. This config is deliberately standalone: it
 * resolves only the `@/` alias and runs the server-side modules under Node.
 *
 * Tests target `*.server.ts` and `preview.schema.ts`. Environment variables are
 * set per test file so provider resolution is exercised explicitly rather than
 * inherited from the shell.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Server modules read process.env; keep files isolated so a test cannot leak
    // configuration into the next one.
    isolate: true,
    restoreMocks: true,
  },
});
