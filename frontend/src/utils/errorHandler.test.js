import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ErrorType,
  ErrorSeverity,
  AppError,
  ErrorHandler,
  handleError,
  errorHandler
} from './errorHandler.js';

describe('ErrorHandler', () => {
  describe('AppError', () => {
    it('should create AppError with default values', () => {
      const error = new AppError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('should create AppError with custom values', () => {
      const error = new AppError(
        'Network error',
        ErrorType.NETWORK_ERROR,
        ErrorSeverity.HIGH,
        500,
        { details: 'test' }
      );
      expect(error.type).toBe(ErrorType.NETWORK_ERROR);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.statusCode).toBe(500);
    });

    it('should serialize to JSON correctly', () => {
      const error = new AppError('Test');
      const json = error.toJSON();
      expect(json.name).toBe('AppError');
      expect(json.message).toBe('Test');
      expect(json.timestamp).toBeDefined();
    });
  });

  describe('ErrorHandler', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should handle normal Error', () => {
      const error = new Error('Network error');
      const appError = errorHandler.normalizeError(error);
      expect(appError).toBeInstanceOf(AppError);
    });

    it('should handle TypeError for network', () => {
      const error = new TypeError('Failed to fetch');
      const appError = errorHandler.normalizeError(error);
      expect(appError.type).toBe(ErrorType.API_ERROR);
    });

    it('should register and call error callback', () => {
      const callback = vi.fn();
      const unsubscribe = errorHandler.onError(callback);

      const error = new AppError('Test');
      errorHandler.handleError(error, {});

      expect(callback).toHaveBeenCalledWith(error, {});
      unsubscribe();
    });
  });

  describe('handleError function', () => {
    it('should return AppError instance', () => {
      const result = handleError(new Error('test'));
      expect(result).toBeInstanceOf(AppError);
    });
  });
});
