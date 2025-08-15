import { useState, useEffect, useCallback, useRef } from 'react';
import { handleError, AppError, ErrorType } from '../utils/errorHandler';

/**
 * 自定义 Hook：useApi
 * 提供统一的数据获取逻辑，支持缓存、重试、错误处理等功能
 * 
 * @param {Object} options - 配置选项
 * @param {string} options.url - API URL
 * @param {Object} options.options - fetch 选项
 * @param {boolean} options.enabled - 是否启用请求
 * @param {boolean} options.cache - 是否启用缓存
 * @param {number} options.cacheTime - 缓存时间（毫秒）
 * @param {number} options.retryCount - 重试次数
 * @param {number} options.retryDelay - 重试延迟（毫秒）
 * @param {Function} options.onSuccess - 成功回调
 * @param {Function} options.onError - 错误回调
 * @param {Function} options.transformResponse - 响应转换函数
 * @param {any} options.initialData - 初始数据
 * @returns {Object} 包含数据、加载状态、错误等信息的对象
 */
export function useApi({
  url,
  options = {},
  enabled = true,
  cache = true,
  cacheTime = 5 * 60 * 1000, // 5分钟缓存
  retryCount = 3,
  retryDelay = 1000,
  onSuccess,
  onError,
  transformResponse,
  initialData = null,
}) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const cacheRef = useRef(new Map());
  const abortControllerRef = useRef(null);
  const retryCountRef = useRef(0);

  // 获取缓存键
  const getCacheKey = useCallback(() => {
    return JSON.stringify({ url, options });
  }, [url, options]);

  // 检查缓存是否有效
  const isCacheValid = useCallback((cacheKey) => {
    if (!cache) return false;
    
    const cached = cacheRef.current.get(cacheKey);
    if (!cached) return false;
    
    return Date.now() - cached.timestamp < cacheTime;
  }, [cache, cacheTime]);

  // 从缓存获取数据
  const getFromCache = useCallback((cacheKey) => {
    if (!isCacheValid(cacheKey)) return null;
    
    const cached = cacheRef.current.get(cacheKey);
    return cached.data;
  }, [isCacheValid]);

  // 设置缓存
  const setCache = useCallback((cacheKey, cacheData) => {
    if (!cache) return;
    
    cacheRef.current.set(cacheKey, {
      data: cacheData,
      timestamp: Date.now(),
    });
  }, [cache]);

  // 清除缓存
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  // 执行请求
  const fetchData = useCallback(async (shouldUseCache = true) => {
    if (!enabled) return;

    const cacheKey = getCacheKey();
    
    // 检查缓存
    if (shouldUseCache && isCacheValid(cacheKey)) {
      const cachedData = getFromCache(cacheKey);
      setData(cachedData);
      setLoading(false);
      setError(null);
      return cachedData;
    }

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 创建新的 AbortController
    abortControllerRef.current = new AbortController();
    
    try {
      setLoading(true);
      setError(null);
      retryCountRef.current = 0;

      const response = await fetch(url, {
        ...options,
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      let responseData = await response.json();
      
      // 转换响应数据
      if (transformResponse) {
        responseData = transformResponse(responseData);
      }

      setData(responseData);
      setLastUpdated(Date.now());
      
      // 设置缓存
      setCache(cacheKey, responseData);
      
      // 成功回调
      if (onSuccess) {
        onSuccess(responseData);
      }

      return responseData;
    } catch (err) {
      // 如果是手动取消的请求，不处理错误
      if (err.name === 'AbortError') {
        return;
      }

      retryCountRef.current++;
      
      // 如果还有重试次数，则延迟重试
      if (retryCountRef.current <= retryCount) {
        setTimeout(() => {
          fetchData(false);
        }, retryDelay * retryCountRef.current);
        return;
      }

      // 处理错误
      const appError = handleError(err, {
        url,
        options,
        retryCount: retryCountRef.current,
      });

      setError(appError);
      
      // 错误回调
      if (onError) {
        onError(appError);
      }

      throw appError;
    } finally {
      setLoading(false);
    }
  }, [
    url,
    options,
    enabled,
    getCacheKey,
    isCacheValid,
    getFromCache,
    setCache,
    onSuccess,
    onError,
    transformResponse,
    retryCount,
    retryDelay,
  ]);

  // 手动触发请求
  const refetch = useCallback(() => {
    return fetchData(false);
  }, [fetchData]);

  // 更新数据（乐观更新）
  const mutate = useCallback(async (mutateData, shouldRevalidate = true) => {
    // 乐观更新
    const previousData = data;
    setData(mutateData);

    try {
      if (shouldRevalidate) {
        await refetch();
      }
    } catch (err) {
      // 如果失败，回滚到之前的数据
      setData(previousData);
      throw err;
    }
  }, [data, refetch]);

  // 初始化请求
  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [enabled, fetchData]);

  // 清理函数
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refetch,
    mutate,
    clearCache,
  };
}

/**
 * 自定义 Hook：useApiMutation
 * 用于处理 POST、PUT、DELETE 等修改操作
 * 
 * @param {Object} options - 配置选项
 * @param {string} options.url - API URL
 * @param {string} options.method - HTTP 方法
 * @param {Function} options.onSuccess - 成功回调
 * @param {Function} options.onError - 错误回调
 * @param {Function} options.onMutate - 变更前回调
 * @param {Function} options.onSettled - 完成回调
 * @param {boolean} options.invalidateQueries - 是否使相关查询失效
 * @returns {Object} 包含 mutate 函数、加载状态、错误等信息的对象
 */
export function useApiMutation({
  url,
  method = 'POST',
  onSuccess,
  onError,
  onMutate,
  onSettled,
  invalidateQueries = true,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const mutate = useCallback(async (variables, options = {}) => {
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 创建新的 AbortController
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      // 变更前回调
      let context = {};
      if (onMutate) {
        context = await onMutate(variables);
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(variables),
        signal: abortControllerRef.current.signal,
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();

      // 成功回调
      if (onSuccess) {
        await onSuccess(responseData, variables, context);
      }

      return responseData;
    } catch (err) {
      // 如果是手动取消的请求，不处理错误
      if (err.name === 'AbortError') {
        return;
      }

      const appError = handleError(err, {
        url,
        method,
        variables,
      });

      setError(appError);
      
      // 错误回调
      if (onError) {
        await onError(appError, variables, context);
      }

      throw appError;
    } finally {
      setLoading(false);
      
      // 完成回调
      if (onSettled) {
        await onSettled(error, variables, context);
      }
    }
  }, [
    url,
    method,
    onMutate,
    onSuccess,
    onError,
    onSettled,
  ]);

  // 清理函数
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    mutate,
    loading,
    error,
  };
}

/**
 * 自定义 Hook：useApiQuery
 * 用于处理 GET 请求，提供查询功能
 * 
 * @param {Object} options - 配置选项
 * @param {string} options.url - API URL
 * @param {Object} options.params - 查询参数
 * @param {Object} options.options - fetch 选项
 * @returns {Object} 包含数据、加载状态、错误等信息的对象
 */
export function useApiQuery({
  url,
  params = {},
  options = {},
  ...rest
}) {
  // 构建带参数的 URL
  const fullUrl = useMemo(() => {
    const urlObj = new URL(url, window.location.origin);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        urlObj.searchParams.append(key, value);
      }
    });
    return urlObj.toString();
  }, [url, params]);

  return useApi({
    url: fullUrl,
    options,
    ...rest,
  });
}

// 导出便捷 Hook
export { useApi as default };

/**
 * 创建 API Hook 的工厂函数
 * @param {string} baseUrl - 基础 URL
 * @returns {Object} 包含多个预配置的 Hook
 */
export function createApiHooks(baseUrl) {
  /**
   * 获取数据
   */
  const useGetData = (endpoint, options) => {
    return useApi({
      url: `${baseUrl}${endpoint}`,
      ...options,
    });
  };

  /**
   * 创建数据
   */
  const useCreateData = (endpoint, options) => {
    return useApiMutation({
      url: `${baseUrl}${endpoint}`,
      method: 'POST',
      ...options,
    });
  };

  /**
   * 更新数据
   */
  const useUpdateData = (endpoint, options) => {
    return useApiMutation({
      url: `${baseUrl}${endpoint}`,
      method: 'PUT',
      ...options,
    });
  };

  /**
   * 删除数据
   */
  const useDeleteData = (endpoint, options) => {
    return useApiMutation({
      url: `${baseUrl}${endpoint}`,
      method: 'DELETE',
      ...options,
    });
  };

  /**
   * 查询数据
   */
  const useQueryData = (endpoint, params, options) => {
    return useApiQuery({
      url: `${baseUrl}${endpoint}`,
      params,
      ...options,
    });
  };

  return {
    useGetData,
    useCreateData,
    useUpdateData,
    useDeleteData,
    useQueryData,
  };
}
