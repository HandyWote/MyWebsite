import { getApiUrl } from '../../config/api'; // 导入API配置

export const verifyToken = async () => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return { valid: false, error: 'Token不存在' };
  }

  try {
    const response = await fetch(getApiUrl.adminLogin().replace('/login', '/verify'), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json();
      return { valid: data.code === 0 };
    } else {
      return { valid: false, error: 'Token已过期或无效' };
    }
  } catch (error) {
    return { valid: false, error: '网络错误' };
  }
};

export const clearAuth = () => {
  localStorage.removeItem('token');
};

export const saveRedirectPath = (path) => {
  sessionStorage.setItem('redirectPath', path);
};

export const getAndClearRedirectPath = () => {
  const path = sessionStorage.getItem('redirectPath');
  sessionStorage.removeItem('redirectPath');
  return path || '/admin';
};


