/**
 * 异步 action 的 loading/error 模板收敛。
 *
 * 用法：
 *   await withLoading(set, 'loading', 'error', async () => {
 *     const data = await articleApi.fetchArticles(...);
 *     set({ data }); // 业务状态更新留在 fn 内
 *     return data;
 *   });
 *
 * errorKey 传 null 时只管理 loading（如 aiStore 的 settings* 状态没有 error 字段）。
 * rethrow=false 时吞掉错误（与旧 articleStore.fetchArticles 行为一致），
 * 默认向上抛出，调用方保持 catch 语义不变。
 *
 * 返回类型按 rethrow 分档：默认（会抛错）时 fn 的成功值一定存在，故返回 `Promise<T>`；
 * `rethrow: false` 时错误被吞，失败路径返回 undefined。这样 store 的 action 不必再
 * 为了 `T | undefined` 在消费侧补空值判断或断言。
 */

/** zustand set 的最小形状：只要求能接收状态补丁（store 的 State 由调用方保证）。 */
export type LoadingSetter = (partial: Record<string, unknown>) => void;

export function withLoading<T>(
  set: LoadingSetter,
  loadingKey: string,
  errorKey: string | null,
  fn: () => Promise<T>,
  options?: { rethrow?: true },
): Promise<T>;
export function withLoading<T>(
  set: LoadingSetter,
  loadingKey: string,
  errorKey: string | null,
  fn: () => Promise<T>,
  options: { rethrow?: boolean },
): Promise<T | undefined>;
export async function withLoading<T>(
  set: LoadingSetter,
  loadingKey: string,
  errorKey: string | null,
  fn: () => Promise<T>,
  { rethrow = true }: { rethrow?: boolean } = {},
): Promise<T | undefined> {
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
      ...(errorKey ? { [errorKey]: (err as Error).message } : {}),
    });
    if (rethrow) {
      throw err;
    }
    return undefined;
  }
}
