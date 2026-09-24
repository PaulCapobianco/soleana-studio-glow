// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  vite: {
    plugins: [],
    build: {
      rollupOptions: {
        plugins: [
          visualizer({
            filename: "dist/stats.html",
            template: "treemap",
            gzipSize: true,
            brotliSize: true,
            open: false,
          }),
        ],
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;

            if (id.includes("@tanstack")) return "vendor-tanstack";
            if (id.includes("@supabase")) return "vendor-supabase";
            if (id.includes("@radix-ui")) return "vendor-radix";
            if (
              id.includes("react-dom") ||
              id.includes("/react/") ||
              id.includes("react/jsx-runtime") ||
              id.includes("scheduler") ||
              id.includes("react-is") ||
              id.includes("use-sync-external-store") ||
              id.includes("loose-envify")
            ) {
              return "vendor-react";
            }
            if (id.includes("lucide-react")) return "vendor-lucide";
            if (id.includes("sonner")) return "vendor-sonner";
            if (id.includes("date-fns")) return "vendor-datefns";
            if (id.includes("embla-carousel")) return "vendor-carousel";
            if (id.includes("react-hook-form") || id.includes("@hookform/resolvers")) return "vendor-forms";
            if (id.includes("zod")) return "vendor-zod";
            if (id.includes("recharts")) return "vendor-recharts";

            return "vendor";
          },
        },
      },
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
