/**
 * 认证会话工具（公共层）
 *
 * clearAuth 的唯一实现所在。api/browser.ts（401 拦截）与
 * admin/utils/auth.ts 都从这里引用，避免双实现漂移。
 */

/** 清掉本地登录态。幂等：未登录时调用无副作用。 */
export const clearAuth = (): void => {
	localStorage.removeItem("token");
};
