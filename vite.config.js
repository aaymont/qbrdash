import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { odataProxy } from "./vite-odata-proxy";
const pkg = await import("./package.json", { assert: { type: "json" } });
export default defineConfig({
    define: {
        __APP_VERSION__: JSON.stringify(pkg.default.version),
    },
    plugins: [react(), odataProxy()],
    resolve: {
        alias: { "@": path.resolve(__dirname, "./src") },
    },
    base: process.env.GITHUB_PAGES === "1" ? "/qbrdash/" : "/",
    server: {
        proxy: process.env.VITE_PROXY_URL
            ? {
                "/geotab-proxy": {
                    target: process.env.VITE_PROXY_URL,
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/geotab-proxy/, ""),
                },
            }
            : undefined,
    },
});
