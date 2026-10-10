import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Tauri 前端：hash 路由 + 多页面（主界面 / 内嵌播放器）
export default defineConfig({
  // 相对路径：同一份 dist 也要作为「巨应3 怀旧」皮肤从 skin.localhost 子路径
  // 服务（build.rs 嵌入），绝对路径在子路径下会 404
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // 端口与 tauri.conf.json 的 devUrl 保持一致
  server: {
    port: 5173,
    strictPort: true,
  },
  clearScreen: false,
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: "chrome105",
    minify: "esbuild",
    sourcemap: false,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        player: path.resolve(__dirname, "player.html"),
      },
    },
  },
});
