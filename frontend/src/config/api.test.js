import { describe, it, expect } from 'vitest';
import {
  API_CONFIG,
  API_ENDPOINTS,
  getApiUrl,
  buildApiUrl,
  unwrapApiPayload,
  getApiMessage,
} from './api.js';

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
      expect(API_ENDPOINTS.PUBLIC.AVATAR_FILE('avatar.webp')).toBe('/api/avatars/file/avatar.webp');
    });

    it('should have ADMIN endpoints', () => {
      expect(API_ENDPOINTS.ADMIN).toBeDefined();
      expect(API_ENDPOINTS.ADMIN.LOGIN).toBe('/api/admin/login');
    });

  });

  describe('buildApiUrl', () => {
    it('should build correct URL', () => {
      const result = buildApiUrl('/api/articles');
      expect(result).toContain('/api/articles');
    });

    it('should use relative path in dev when base url is empty', () => {
      const result = buildApiUrl('/api/site-blocks');
      expect(result).toBe('/api/site-blocks');
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

    it('should expose base URL helper', () => {
      expect(getApiUrl.baseUrl()).toBeDefined();
    });
  });

  describe('api response helpers', () => {
    it('should unwrap code/data response payload', () => {
      const payload = unwrapApiPayload({ code: 0, data: { id: 1 } });
      expect(payload).toEqual({ id: 1 });
    });

    it('should keep raw response when payload wrapper is absent', () => {
      const payload = unwrapApiPayload({ id: 2 });
      expect(payload).toEqual({ id: 2 });
    });

    it('should resolve message from msg first', () => {
      expect(getApiMessage({ msg: '失败' })).toBe('失败');
    });
  });
});
