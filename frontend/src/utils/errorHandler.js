/**
 * 错误处理工具
 * 提供统一的错误处理机制
 */

// 错误类型枚举
export const ErrorType = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  API_ERROR: 'API_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

// 错误严重级别
export const ErrorSeverity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

// 错误类
export class AppError extends Error {
  constructor(
    message,
    type = ErrorType.UNKNOWN_ERROR,
    severity = ErrorSeverity.MEDIUM,
    statusCode = null,
    details = null
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.severity = severity;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      severity: this.severity,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

// 错误处理器类
export class ErrorHandler {
  constructor() {
    this.errorCallbacks = [];
    this.globalErrorHandlers = [];
  }

  /**
   * 注册错误回调
   * @param {Function} callback - 错误回调函数
   */
  onError(callback) {
    this.errorCallbacks.push(callback);
    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index > -1) {
        this.errorCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * 注册全局错误处理器
   * @param {Function} handler - 全局错误处理器
   */
  onGlobalError(handler) {
    this.globalErrorHandlers.push(handler);
    return () => {
      const index = this.globalErrorHandlers.indexOf(handler);
      if (index > -1) {
        this.globalErrorHandlers.splice(index, 1);
      }
    };
  }

  /**
   * 处理错误
   * @param {Error|AppError} error - 错误对象
   * @param {Object} context - 错误上下文
   */
  handleError(error, context = {}) {
    // 将普通错误转换为 AppError
    const appError = this.normalizeError(error);
    
    // 添加上下文信息
    appError.context = context;

    // 记录错误
    this.logError(appError);

    // 通知所有错误回调
    this.errorCallbacks.forEach(callback => {
      try {
        callback(appError, context);
      } catch (err) {
        console.error('Error in error callback:', err);
      }
    });

    // 根据错误类型和严重级别采取不同措施
    this.handleBySeverity(appError, context);

    return appError;
  }

  /**
   * 标准化错误对象
   * @param {Error|AppError} error - 错误对象
   * @returns {AppError} 标准化的错误对象
   */
  normalizeError(error) {
    if (error instanceof AppError) {
      return error;
    }

    // 处理网络错误
    if (error.name === 'TypeError' && error.message.includes('NetworkError')) {
      return new AppError(
        '网络连接失败，请检查网络设置',
        ErrorType.NETWORK_ERROR,
        ErrorSeverity.HIGH,
        null,
        { originalError: error }
      );
    }

    // 处理 API 错误
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      return new AppError(
        '请求失败，服务器可能暂时不可用',
        ErrorType.API_ERROR,
        ErrorSeverity.MEDIUM,
        null,
        { originalError: error }
      );
    }

    // 处理其他错误
    return new AppError(
      error.message || '发生未知错误',
      ErrorType.UNKNOWN_ERROR,
      ErrorSeverity.MEDIUM,
      null,
      { originalError: error }
    );
  }

  /**
   * 记录错误
   * @param {AppError} error - 错误对象
   */
  logError(error) {
    const errorData = error.toJSON();
    
    // 在开发环境中输出详细错误信息
    if (import.meta.env.DEV) {
      console.group(`🚨 Error: ${error.type}`);
      console.error('Message:', error.message);
      console.error('Details:', error.details);
      console.error('Context:', error.context);
      console.error('Stack:', error.stack);
      console.groupEnd();
    }

    // 在生产环境中，可以发送到错误追踪服务
    if (import.meta.env.PROD) {
      // TODO: 发送到 Sentry 或其他错误追踪服务
      // this.sendToErrorTracking(errorData);
    }

    // 保存到本地存储（可选）
    this.saveErrorToLocalStorage(errorData);
  }

  /**
   * 根据错误严重级别处理错误
   * @param {AppError} error - 错误对象
   * @param {Object} context - 错误上下文
   */
  handleBySeverity(error, context) {
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        // 严重错误：显示全局错误页面
        this.showCriticalError(error, context);
        break;
      case ErrorSeverity.HIGH:
        // 高级错误：显示错误提示，可能需要用户操作
        this.showHighSeverityError(error, context);
        break;
      case ErrorSeverity.MEDIUM:
        // 中级错误：显示错误提示
        this.showMediumSeverityError(error, context);
        break;
      case ErrorSeverity.LOW:
        // 低级错误：静默处理或记录
        this.showLowSeverityError(error, context);
        break;
      default:
        this.showMediumSeverityError(error, context);
    }
  }

  /**
   * 显示严重错误
   * @param {AppError} error - 错误对象
   * @param {Object} context - 错误上下文
   */
  showCriticalError(error, context) {
    // 可以重定向到错误页面
    if (context.navigate) {
      context.navigate('/error', { 
        state: { error: error.toJSON() } 
      });
    }
    
    // 显示全局错误提示
    this.showGlobalErrorAlert(error);
  }

  /**
   * 显示高级错误
   * @param {AppError} error - 错误对象
   * @param {Object} context - 错误上下文
   */
  showHighSeverityError(error, context) {
    // 显示错误提示
    this.showErrorAlert(error);
    
    // 如果有重试函数，提供重试选项
    if (context.retry) {
      this.showRetryOption(error, context.retry);
    }
  }

  /**
   * 显示中级错误
   * @param {AppError} error - 错误对象
   */
  showMediumSeverityError(error) {
    // 显示错误提示
    this.showErrorAlert(error);
  }

  /**
   * 显示低级错误
   * @param {AppError} error - 错误对象
   */
  showLowSeverityError(error) {
    // 静默处理，只记录日志
    console.warn('Low severity error:', error.message);
  }

  /**
   * 显示错误提示
   * @param {AppError} error - 错误对象
   */
  showErrorAlert(error) {
    // 使用 window.alert 或更优雅的提示组件
    if (typeof window !== 'undefined') {
      // 这里可以使用 toast、snackbar 等组件
      console.warn('Error:', error.message);
      
      // 触发自定义事件，让 UI 组件可以监听并显示错误
      window.dispatchEvent(new CustomEvent('app-error', {
        detail: { error: error.toJSON() }
      }));
    }
  }

  /**
   * 显示全局错误提示
   * @param {AppError} error - 错误对象
   */
  showGlobalErrorAlert(error) {
    if (typeof window !== 'undefined') {
      // 触发全局错误事件
      window.dispatchEvent(new CustomEvent('app-global-error', {
        detail: { error: error.toJSON() }
      }));
    }
  }

  /**
   * 显示重试选项
   * @param {AppError} error - 错误对象
   * @param {Function} retry - 重试函数
   */
  showRetryOption(error, retry) {
    if (typeof window !== 'undefined') {
      // 触发重试事件
      window.dispatchEvent(new CustomEvent('app-retry-error', {
        detail: { error: error.toJSON(), retry }
      }));
    }
  }

  /**
   * 保存错误到本地存储
   * @param {Object} errorData - 错误数据
   */
  saveErrorToLocalStorage(errorData) {
    try {
      const errors = JSON.parse(localStorage.getItem('app_errors') || '[]');
      errors.push(errorData);
      
      // 只保留最近 50 个错误
      if (errors.length > 50) {
        errors.splice(0, errors.length - 50);
      }
      
      localStorage.setItem('app_errors', JSON.stringify(errors));
    } catch (err) {
      console.error('Failed to save error to localStorage:', err);
    }
  }

  /**
   * 获取本地存储的错误
   * @returns {Array} 错误列表
   */
  getLocalErrors() {
    try {
      return JSON.parse(localStorage.getItem('app_errors') || '[]');
    } catch (err) {
      console.error('Failed to get errors from localStorage:', err);
      return [];
    }
  }

  /**
   * 清除本地存储的错误
   */
  clearLocalErrors() {
    try {
      localStorage.removeItem('app_errors');
    } catch (err) {
      console.error('Failed to clear errors from localStorage:', err);
    }
  }
}

// 创建全局错误处理器实例
export const errorHandler = new ErrorHandler();

// 全局错误处理
if (typeof window !== 'undefined') {
  // 处理未捕获的 JavaScript 错误
  window.addEventListener('error', (event) => {
    errorHandler.handleError(event.error, {
      source: event.filename,
      line: event.lineno,
      column: event.colno,
    });
    event.preventDefault();
  });

  // 处理未捕获的 Promise 拒绝
  window.addEventListener('unhandledrejection', (event) => {
    errorHandler.handleError(event.reason, {
      source: 'unhandledrejection',
    });
    event.preventDefault();
  });
}

// 导出便捷函数
export const handleError = (error, context) => errorHandler.handleError(error, context);
export const onError = (callback) => errorHandler.onError(callback);
export const onGlobalError = (handler) => errorHandler.onGlobalError(handler);
export const getLocalErrors = () => errorHandler.getLocalErrors();
export const clearLocalErrors = () => errorHandler.clearLocalErrors();

// 默认导出
export default errorHandler;
