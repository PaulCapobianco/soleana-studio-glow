import { defineConfig } from "vitest/config";

// Config dédiée aux tests de logique pure (pas de React ni de Vite plugin ici,
// pour rester indépendant de @lovable.dev/vite-tanstack-config).
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
