import { authApi } from "../../api/authApi";
import { clearAuth } from "../../utils/auth";

export { clearAuth };

/** verifyToken 的结果：valid=false 时带游客可读的原因（RequireAuth 直接展示）。 */
export interface VerifyTokenResult {
	valid: boolean;
	error?: string;
}

export const verifyToken = async (): Promise<VerifyTokenResult> => {
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
