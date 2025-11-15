import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? '/' : './',
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
          utils: ['axios', 'moment', 'xss', 'socket.io-client'],
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
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
      // WebSocket代理配置 - 支持Flask-SocketIO
      '/socket.io': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:5000',
        changeOrigin: true,
        ws: true,
        secure: false,
        rewrite: (path) => path,
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
