import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // binds to 0.0.0.0 so other devices on the LAN can reach it
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4310",
        changeOrigin: true,
      },
    },
  },
});
