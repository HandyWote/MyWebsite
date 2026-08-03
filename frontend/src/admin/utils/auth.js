import { apiClient } from '../../config/api';
import { clearAuth } from '../../utils/auth';

export { clearAuth };

export const verifyToken = async () => {
  const token = localStorage.getItem('token');

  if (!token) {
    return { valid: false, error: 'Token不存在' };
  }

  try {
    // 使用 noAuth 避免双重注入——我们需要手动控制 credentials
    const payload = await apiClient('/api/admin/verify', {
      noAuth: true,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    return { valid: !!payload?.valid };
  } catch {
    return { valid: false, error: 'Token已过期或无效' };
  }
};

export const saveRedirectPath = (path) => {
  sessionStorage.setItem('redirectPath', path);
};

export const getAndClearRedirectPath = () => {
  const path = sessionStorage.getItem('redirectPath');
  sessionStorage.removeItem('redirectPath');
  return path || '/admin';
};
