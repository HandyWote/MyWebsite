// 调试文件 - 检查环境变量
// 导入API配置
import { API_CONFIG, getApiUrl } from './api.js';

// 只在开发环境下输出调试信息
if (import.meta.env.DEV) {
  console.log('=== 环境变量调试信息 ===');
  console.log('import.meta.env.VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
  console.log('import.meta.env.DEV:', import.meta.env.DEV);
  console.log('import.meta.env.PROD:', import.meta.env.PROD);
  console.log('import.meta.env.MODE:', import.meta.env.MODE);

  console.log('API_CONFIG.BASE_URL:', API_CONFIG.BASE_URL);
  console.log('getApiUrl.siteBlocks():', getApiUrl.siteBlocks());
  console.log('getApiUrl.websocket():', getApiUrl.websocket());
  console.log('getApiUrl.articles():', getApiUrl.articles());
  console.log('getApiUrl.articleDetail(1):', getApiUrl.articleDetail(1));
  console.log('getApiUrl.categories():', getApiUrl.categories());
  console.log('getApiUrl.tags():', getApiUrl.tags());
  console.log('=== 调试信息结束 ===');
}
