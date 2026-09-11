import { defineConfig } from "vite";
import path from "path";

// 皮肤客户端 SDK：IIFE 单文件，暴露 window.WallpaperClient。
// 产物输出到 src-tauri/src/generated/client-sdk.js，由 skin:// 协议内嵌提供，
// 因此产物需随源码入库（在 Rust include_str! 之前存在）。
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "chrome105",
    minify: "esbuild",
    sourcemap: false,
    outDir: path.resolve(__dirname, "../../src-tauri/src/generated"),
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, "src/client-sdk/index.ts"),
      formats: ["iife"],
      name: "WallpaperClient",
      fileName: () => "client-sdk.js",
    },
  },
});
