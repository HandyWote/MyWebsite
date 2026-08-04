import { authApi } from "../../api/authApi";
import { clearAuth } from "../../utils/auth";

export { clearAuth };

export const verifyToken = async () => {
	const token = localStorage.getItem("token");

	if (!token) {
		return { valid: false, error: "Token不存在" };
	}

	try {
		const payload = await authApi.verify(token);
		return { valid: !!payload?.valid };
	} catch {
		return { valid: false, error: "Token已过期或无效" };
	}
};

export const saveRedirectPath = (path) => {
	sessionStorage.setItem("redirectPath", path);
};

export const getAndClearRedirectPath = () => {
	const path = sessionStorage.getItem("redirectPath");
	sessionStorage.removeItem("redirectPath");
	return path?.startsWith("/admin") && !path.startsWith("//") ? path : "/admin";
};
