import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  base: "./",

  server: {
    host: true,
    port: 8080,
  },

  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },

  build: {
    rollupOptions: {
      output: {
        entryFileNames: "assets/js/index.js",
        chunkFileNames: "assets/js/[name].js",
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name ?? "";

          if (name.endsWith(".css")) {
            return "assets/css/index.css";
          }

          if (/\.(png|jpe?g|svg|gif|webp)$/.test(name)) {
            return "assets/images/[name][extname]";
          }

          return "assets/[name][extname]";
        },
      },
    },
  },
});