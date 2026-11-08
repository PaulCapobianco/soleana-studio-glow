import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Config indépendante de @lovable.dev/vite-tanstack-config (pour ne pas dépendre de son setup
// TanStack Start/Cloudflare). Le plugin React ici ne sert qu'à transformer le JSX des tests de
// composants ; l'environnement par défaut reste "node" (rapide) et seuls les fichiers qui en ont
// besoin passent en "jsdom" via un commentaire `// @vitest-environment jsdom` en tête de fichier.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "scripts/photos-storage/**/*.test.ts",
      "scripts/photos-storage/**/*.test.tsx",
    ],
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
