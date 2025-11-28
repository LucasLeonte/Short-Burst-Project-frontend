import { defineConfig } from "vite";

// Proxy `/api` to backend to avoid CORS during local development.
// Requests to `/api/*` from the Vite dev server will be forwarded to http://localhost:8080
export default defineConfig({
    server: {
        proxy: {
            "/api": {
                target: "http://localhost:8080",
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path, // keep the /api prefix
            },
        },
    },
});
