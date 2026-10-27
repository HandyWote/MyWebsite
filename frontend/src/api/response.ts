/**
 * API 响应信封与解析的唯一实现。
 *
 * 后端 HTTP 状态码与业务 code 是两套信号：`{code: 400}` 常常随 HTTP 200 一起返回
 * （例如登录参数校验失败），只看 `response.ok` 会把失败当成功（工单 #16）。
 * 因此 `parseApiPayload` 同时判 `!ok` 与 `code !== 0`，四个传输层（browser /
 * auth / drawing / server）都只调它，不再各写一份。
 *
 * 本模块保持纯函数：不碰 window、不做 401 跳转，方便浏览器端、RSC 端与
 * node 环境共用。401 的会话副作用由 browser.ts 在调用点自己处理。
 */

export type ApiEnvelope<T> = {
	code?: number;
	data?: T;
	message?: string;
	msg?: string;
};

export class ApiError extends Error {
	constructor(
		public readonly status: number,
		message: string,
		/** 原始响应体，供调用方读取契约扩展字段（409 `current_version`、422 `reason` 等）。 */
		public readonly body?: unknown,
	) {
		super(message);
		this.name = 'ApiError';
	}
}

/** 从错误响应体里取文案：后端两种命名（`msg` 优先于 `message`）都出现过。 */
export function getApiMessage(payload: unknown, fallback = ''): string {
	if (!payload || typeof payload !== 'object') return fallback;
	const envelope = payload as ApiEnvelope<unknown>;
	return envelope.msg ?? envelope.message ?? fallback;
}

/** 拆 `{code, data}` 信封；裸数据原样返回。 */
export function unwrapApiPayload<T>(payload: ApiEnvelope<T> | T): T {
	if (payload && typeof payload === 'object' && !Array.isArray(payload) && 'data' in payload) {
		return (payload as ApiEnvelope<T>).data as T;
	}
	return payload as T;
}

/**
 * 解析一次响应的最小上下文（取 `Response` 的四个字段，便于测试与 RSC 复用）。
 * `fallbackMessage` 用于响应体没有文案时兜底，默认与浏览器端历史文案一致。
 */
export interface ApiPayloadContext {
	ok: boolean;
	status: number;
	statusText?: string;
	fallbackMessage?: string;
}

/**
 * 校验并拆包：`!ok` 或业务 code 非 0 一律抛 `ApiError`，并把原始 payload
 * 挂到 `error.body`；否则返回拆包后的数据。
 */
export function parseApiPayload<T>(
	payload: ApiEnvelope<T> | T,
	context: ApiPayloadContext,
): T {
	const hasBusinessError =
		Boolean(payload) &&
		typeof payload === 'object' &&
		typeof (payload as ApiEnvelope<T>).code === 'number' &&
		(payload as ApiEnvelope<T>).code !== 0;

	if (!context.ok || hasBusinessError) {
		throw new ApiError(
			context.status,
			getApiMessage(payload, context.fallbackMessage ?? 'Request failed'),
			payload,
		);
	}
	return unwrapApiPayload(payload);
}
