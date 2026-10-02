import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,

    // Directly forward all backend requests to Flask
    // In hostel-harmony-56-main/vite.config.ts
    allowedHosts: ['hostel-hub-management-system.onrender.com'],
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        // target: "https://hostel-hub-management-system-production.up.railway.app",
        changeOrigin: true,
        secure: false,
      },
      "/auth": {
        target: "http://127.0.0.1:5000",
        // target: "https://hostel-hub-management-system-production.up.railway.app",
        changeOrigin: true,
        secure: false,
      },
    },
  },

  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
