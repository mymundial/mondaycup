import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/leaderboard": {
        target: process.env.VITE_PUBLIC_LEADERBOARD_API_BASE || "https://mondaycup.co.uk",
        changeOrigin: true,
        secure: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1200,
  },
});
