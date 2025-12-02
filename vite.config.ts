import { defineConfig, loadEnv, type ConfigEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { visualizer } from "rollup-plugin-visualizer";
import { VitePWA } from "vite-plugin-pwa";
import type { ServerOptions } from "https";

// https://vitejs.dev/config/
export default defineConfig(({ mode }: ConfigEnv) => {
  // Load environment variables based on the current mode
  const env = loadEnv(mode, process.cwd(), "");

  const isProduction = mode === "production";
  const isDevelopment = !isProduction;

  // Configure HTTPS options if needed
  const httpsOptions: ServerOptions | undefined =
    env.HTTPS === "true"
      ? {
          cert: env.SSL_CRT_FILE || ".cert/localhost.crt",
          key: env.SSL_KEY_FILE || ".cert/localhost.key",
        }
      : undefined;

  return {
    // Base public path when served in development or production
    base: isProduction ? "./" : "/",

    plugins: [
      react({
        // Enable fast refresh in development
        ...(isDevelopment ? { fastRefresh: true } : {}),
        // Use React 17+ automatic JSX transform
        jsxImportSource: "react",
        // Only include React import in development
        babel: {
          plugins: [],
        },
      }),
      // PWA Plugin for mobile app (simplified)
      VitePWA({
        registerType: "autoUpdate",
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
          globIgnores: ["**/*.wasm"], // Ignore large WASM files
          maximumFileSizeToCacheInBytes: 50 * 1024 * 1024, // 50MB limit
        },
        manifest: {
          name: "RAVR Audio Engine",
          short_name: "RAVR",
          description:
            "Pokročilý webový audio přehrávač s AI vylepšením a DSP efekty",
          theme_color: "#1a1a1a",
          background_color: "#0a0a0a",
          display: "standalone",
          orientation: "portrait",
          scope: "/",
          start_url: "/",
          icons: [
            {
              src: "pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
            },
          ],
        },
      }),
      // Bundle analysis (only in production build)
      isProduction &&
        visualizer({
          open: false,
          gzipSize: true,
          brotliSize: true,
          filename: "dist/stats.html",
        }),
    ].filter(Boolean) as Plugin[],

    // Resolve configuration
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@/web": path.resolve(__dirname, "./src/web"),
        "@/shared": path.resolve(__dirname, "./src/shared"),
        "@/core": path.resolve(__dirname, "./src/core"),
        "@/ai": path.resolve(__dirname, "./src/ai"),
        // Handle Node.js built-ins for browser environment
        path: "rollup-plugin-node-polyfills/polyfills/path",
        util: "rollup-plugin-node-polyfills/polyfills/util",
      },
      extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json"],
    },

    // Development server configuration
    server: {
      port: 5175,
      strictPort: true,
      https: httpsOptions,
      open: false,
      host: "0.0.0.0",
      fs: {
        // Allow serving files from one level up from the project root
        allow: [".."],
      },
      // Configure MIME types for WASM files
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
      // Custom middleware for WASM MIME types
      middlewareMode: false,
    },

    // Build configuration
    build: {
      target: "esnext",
      minify: isProduction ? "esbuild" : false,
      sourcemap: isDevelopment ? "inline" : false,
      cssCodeSplit: true,
      ssr: false,

      // Rollup options
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, "index.html"),
        },
        output: {
          manualChunks: {
            // Vendor chunks
            "vendor-react": ["react", "react-dom", "react-router-dom"],
            "vendor-ui": [
              "@radix-ui/react-dialog",
              "@radix-ui/react-slider",
              "@radix-ui/react-switch",
              "framer-motion",
              "lucide-react",
            ],
            "vendor-state": ["zustand", "immer"],
            "vendor-utils": ["clsx", "tailwind-merge"],
            "vendor-media": ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
          },
          chunkFileNames: "assets/js/[name]-[hash].js",
          entryFileNames: "assets/js/[name]-[hash].js",
          assetFileNames: (assetInfo) => {
            const name = assetInfo.name || "unknown";
            const ext = name.split(".").pop()?.toLowerCase() || "";

            if (
              [
                "png",
                "jpg",
                "jpeg",
                "svg",
                "gif",
                "tiff",
                "bmp",
                "ico",
                "webp",
              ].includes(ext)
            ) {
              return "assets/images/[name]-[hash][extname]";
            }
            if (ext === "css") {
              return "assets/css/[name]-[hash][extname]";
            }
            if (["woff", "woff2", "eot", "ttf", "otf"].includes(ext)) {
              return "assets/fonts/[name]-[hash][extname]";
            }
            return "assets/other/[name]-[hash][extname]";
          },
        },
      },

      // ESBuild options
      esbuild: {
        drop: isProduction ? ["console", "debugger"] : [],
        legalComments: "none",
        minifyWhitespace: isProduction,
        minifyIdentifiers: isProduction,
        minifySyntax: isProduction,
        treeShaking: true,
      },

      // Chunk size warnings
      chunkSizeWarningLimit: 1000, // in kBs
      assetsInlineLimit: 4096,
    },

    // CSS configuration
    css: {
      devSourcemap: isDevelopment,
      modules: {
        localsConvention: "camelCaseOnly",
        generateScopedName: isProduction
          ? "[hash:base64:8]"
          : "[name]__[local]--[hash:base64:5]",
      },
    },

    // Environment variables
    define: {
      __APP_VERSION__: JSON.stringify(
        process.env.npm_package_version || "0.1.0"
      ),
      __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
      __MODE__: JSON.stringify(mode),
    },

    // Optimize dependencies
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "zustand",
        "@radix-ui/react-dialog",
        "framer-motion",
        "lucide-react",
        "clsx",
      ],
      exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util", "flac.js", "av"],
    },

    // WASM configuration
    assetsInclude: ["**/*.wasm"],
  };
});
