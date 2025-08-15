import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: {
          react: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          router: ['react-router-dom'],
          utils: ['axios', 'moment', 'xss', 'socket.io-client'],
          animation: ['framer-motion'],
          markdown: ['marked', 'react-markdown', 'remark-gfm', 'rehype-katex']
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
        target: 'http://192.168.31.129:5000',
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
        target: 'http://192.168.31.129:5000',
        changeOrigin: true,
        ws: true,
        secure: false,
        rewrite: (path) => path,
      },
      // 文件上传代理配置
      '/uploads': {
        target: 'http://192.168.31.129:5000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
      }
    },
    port: 3131,
    host: '0.0.0.0'
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  }
})
