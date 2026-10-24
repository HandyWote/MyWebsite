/**
 * 认证会话工具（公共层）
 *
 * clearAuth 的唯一实现所在。config/api.js（401 拦截）与
 * admin/utils/auth.js 都从这里引用，避免双实现漂移。
 */
export const clearAuth = () => {
	localStorage.removeItem("token");
};
