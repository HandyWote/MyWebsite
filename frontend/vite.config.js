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
        manualChunks: (id) => {
          // 更细粒度的代码分割
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor'
            }
            if (id.includes('@mui') || id.includes('@emotion')) {
              return 'mui-vendor'
            }
            if (id.includes('react-router-dom')) {
              return 'router-vendor'
            }
            if (id.includes('framer-motion')) {
              return 'animation-vendor'
            }
            if (id.includes('marked') || id.includes('react-markdown') || 
                id.includes('remark') || id.includes('rehype') || 
                id.includes('katex') || id.includes('mermaid')) {
              return 'markdown-vendor'
            }
            if (id.includes('socket.io-client')) {
              return 'websocket-vendor'
            }
            if (id.includes('axios') || id.includes('moment') || id.includes('xss')) {
              return 'utils-vendor'
            }
            // 其他第三方库
            return 'other-vendor'
          }
          // 页面级别的代码分割
          if (id.includes('/components/Home')) {
            return 'home-page'
          }
          if (id.includes('/components/Articles') || id.includes('/components/Article')) {
            return 'articles-page'
          }
          if (id.includes('/components/Projects')) {
            return 'projects-page'
          }
          if (id.includes('/admin/')) {
            return 'admin-page'
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000,  // 降低警告阈值，更容易发现大文件
    cssCodeSplit: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // 移除console.log
        drop_debugger: true,  // 移除debugger
      }
    },
    // 启用源码映射（生产环境建议关闭）
    sourcemap: false
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
    include: ['react', 'react-dom', 'react-router-dom'],
    exclude: ['socket.io-client']  // 排除socket.io-client的预构建，因为它需要动态加载
  },
  // 性能优化配置
  define: {
    __VUE_OPTIONS_API__: false,  // 如果不使用Vue Options API
    __VUE_PROD_DEVTOOLS__: false,  // 生产环境禁用devtools
  }
})
