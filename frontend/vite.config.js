import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// This file configures the Vite development server.
//
// The "proxy" part is the most important bit for understanding how the
// frontend talks to the backend:
//
//   The React code calls  fetch("/api/tasks")
//   Vite sees the "/api" prefix and forwards the request to
//   http://127.0.0.1:8000/api/tasks (our FastAPI server).
//
// The browser believes everything came from localhost:5173, so there is no
// CORS/blocked-request problem while you are learning.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
