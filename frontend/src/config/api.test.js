import { describe, it, expect } from 'vitest';
import { API_CONFIG, API_ENDPOINTS, getApiUrl, buildApiUrl } from './api.js';

describe('API Configuration', () => {
  describe('API_CONFIG', () => {
    it('should have BASE_URL defined', () => {
      expect(API_CONFIG.BASE_URL).toBeDefined();
    });

    it('should have TIMEOUT defined', () => {
      expect(API_CONFIG.TIMEOUT).toBe(10000);
    });
  });

  describe('API_ENDPOINTS', () => {
    it('should have PUBLIC endpoints', () => {
      expect(API_ENDPOINTS.PUBLIC).toBeDefined();
      expect(API_ENDPOINTS.PUBLIC.ARTICLES).toBe('/api/articles');
    });

    it('should have ADMIN endpoints', () => {
      expect(API_ENDPOINTS.ADMIN).toBeDefined();
      expect(API_ENDPOINTS.ADMIN.LOGIN).toBe('/api/admin/login');
    });

    it('should have WEBSOCKET config', () => {
      expect(API_ENDPOINTS.WEBSOCKET).toBeDefined();
    });
  });

  describe('buildApiUrl', () => {
    it('should build correct URL', () => {
      const result = buildApiUrl('/api/articles');
      expect(result).toContain('/api/articles');
    });
  });

  describe('getApiUrl', () => {
    it('should generate correct siteBlocks URL', () => {
      expect(getApiUrl.siteBlocks()).toContain('site-blocks');
    });

    it('should generate correct article detail URL', () => {
      const url = getApiUrl.articleDetail(123);
      expect(url).toContain('123');
    });

    it('should generate correct admin login URL', () => {
      expect(getApiUrl.adminLogin()).toContain('login');
    });
  });
});
