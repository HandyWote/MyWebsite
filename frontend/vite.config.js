import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'process'
import path from 'path'
import fs from 'fs'

// 自定义插件：构建时生成 .vite/manifest.json，供 Go 后端读取 CSS/JS hash
function viteBuildManifest() {
  return {
    name: 'vite-build-manifest',
    writeBundle(options) {
      const outDir = options.dir || path.resolve(process.cwd(), 'dist');
      const assetsDir = path.join(outDir, 'assets');
      if (!fs.existsSync(assetsDir)) return;

      // 扫描 assets 目录，找到入口 JS 和关联 CSS
      // Vite 6 将入口命名为 index-<hash>（基于 index.html 入口点）
      let entryJs = '';
      const entryCss = [];

      for (const file of fs.readdirSync(assetsDir)) {
        if (file.startsWith('index-') && file.endsWith('.js')) {
          entryJs = 'assets/' + file;
        }
        if (file.startsWith('index-') && file.endsWith('.css')) {
          entryCss.push('assets/' + file);
        }
      }

      const manifest = {
        'src/main.jsx': {
          file: entryJs,
          css: entryCss,
        },
      };

      const manifestDir = path.join(outDir, '.vite');
      fs.mkdirSync(manifestDir, { recursive: true });
      fs.writeFileSync(
        path.join(manifestDir, 'manifest.json'),
        JSON.stringify(manifest, null, 2),
      );
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), viteBuildManifest()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: process.env.NODE_ENV === 'production' ? '/app/' : './',
  build: {
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: {
          react: ['react', 'react-dom', '@emotion/react', '@emotion/styled'],
          mui: ['@mui/material', '@mui/icons-material'],
          router: ['react-router-dom'],
          utils: ['axios', 'moment', 'xss'],
          animation: ['framer-motion'],
          markdown: ['react-markdown', 'marked', 'remark-gfm', 'remark-math', 'rehype-katex'],
          pdf: ['react-pdf', 'pdfjs-dist']
        }
      }
    },
    chunkSizeWarningLimit: 1500,  // 适当提高警告阈值
    cssCodeSplit: true
  },
  server: {
    proxy: {
      // API代理配置
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
      // 文件上传代理配置
      '/uploads': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
      }
    },
    port: 3131,
    host: '0.0.0.0',
    hmr: {
      host: 'localhost',
      protocol: 'ws'
    }
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@emotion/react',
      '@emotion/styled',
      'react-pdf',
      'pdfjs-dist'
    ]
  }
})
