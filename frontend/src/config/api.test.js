// API配置测试文件
// 这个文件用于验证API配置是否正确工作

import { getApiUrl, API_CONFIG, API_ENDPOINTS } from './api.js';

// 测试API配置
console.log('=== API配置测试 ===');

// 测试基础配置
console.log('API_CONFIG:', API_CONFIG);
console.log('API_ENDPOINTS:', API_ENDPOINTS);

// 测试getApiUrl方法
console.log('=== getApiUrl方法测试 ===');
console.log('siteBlocks:', getApiUrl.siteBlocks());
console.log('skills:', getApiUrl.skills());
console.log('contacts:', getApiUrl.contacts());
console.log('avatars:', getApiUrl.avatars());
console.log('articles:', getApiUrl.articles());
console.log('articleDetail(1):', getApiUrl.articleDetail(1));
console.log('avatarFile("test.webp"):', getApiUrl.avatarFile('test.webp'));

console.log('=== 管理后台API测试 ===');
console.log('adminLogin:', getApiUrl.adminLogin());
console.log('adminSkills:', getApiUrl.adminSkills());
console.log('adminContacts:', getApiUrl.adminContacts());
console.log('adminAvatars:', getApiUrl.adminAvatars());
console.log('adminArticles:', getApiUrl.adminArticles());
console.log('adminArticleDetail(1):', getApiUrl.adminArticleDetail(1));
console.log('adminArticleCover:', getApiUrl.adminArticleCover());
console.log('adminArticleAiAnalyze:', getApiUrl.adminArticleAiAnalyze());
console.log('adminArticleBatchDelete:', getApiUrl.adminArticleBatchDelete());
console.log('adminArticleImportMd:', getApiUrl.adminArticleImportMd());
console.log('adminExport:', getApiUrl.adminExport());
console.log('adminImport:', getApiUrl.adminImport());

console.log('=== WebSocket测试 ===');
console.log('websocket:', getApiUrl.websocket());

console.log('=== 测试完成 ===');

// 导出测试函数（可选）
export const testApiConfig = () => {
  console.log('API配置测试完成');
  return {
    baseUrl: API_CONFIG.BASE_URL,
    endpoints: Object.keys(API_ENDPOINTS),
    methods: Object.keys(getApiUrl)
  };
}; 