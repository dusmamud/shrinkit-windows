import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Vite options tailored for Tauri v2 development; `tauri dev` serves this
  // on http://localhost:1420 (see src-tauri/tauri.conf.json `devUrl`).
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: "127.0.0.1",
    watch: {
      // Tell Vite to ignore watching `src-tauri` to avoid feedback loops.
      ignored: ["**/src-tauri/**"],
    },
  },

  build: {
    rollupOptions: {
      output: {
        // One shared lazy chunk for the HEIC decoder: every tool imports it,
        // and without this Rollup emits a separate ~2 MB copy per entry.
        manualChunks: (id) => {
          if (id.includes("libheif-js")) return "heic-decoder";
        },
      },
    },
  },

  worker: {
    // The image engine spawns processor.worker.ts as an ES module worker.
    format: "es",
  },

  optimizeDeps: {
    include: ["exifr", "pica", "gifenc", "jszip"],
  },
});
