/**
 * 异步 action 的 loading/error 模板收敛。
 *
 * 用法：
 *   await withLoading(set, 'loading', 'error', async () => {
 *     const data = await api.get(...);
 *     set({ data }); // 业务状态更新留在 fn 内
 *     return data;
 *   });
 *
 * errorKey 传 null 时只管理 loading（如 aiStore 的 settings* 状态没有 error 字段）。
 * rethrow=false 时吞掉错误（与旧 articleStore.fetchArticles 行为一致），
 * 默认向上抛出，调用方保持 catch 语义不变。
 */
export const withLoading = async (set, loadingKey, errorKey, fn, { rethrow = true } = {}) => {
  set({
    [loadingKey]: true,
    ...(errorKey ? { [errorKey]: null } : {}),
  });
  try {
    const result = await fn();
    set({ [loadingKey]: false });
    return result;
  } catch (err) {
    set({
      [loadingKey]: false,
      ...(errorKey ? { [errorKey]: err.message } : {}),
    });
    if (rethrow) {
      throw err;
    }
    return undefined;
  }
};
