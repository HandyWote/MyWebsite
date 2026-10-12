import { API_ENDPOINTS } from './endpoints';
import { ApiError, getApiMessage, unwrapApiPayload, type ApiEnvelope } from './browser';
import type { Drawing, Stroke } from '@/games/types';

/**
 * 画板公共画布 API（P1 审核链，冻结契约见工单 #9 T8）。
 *
 * 一律走原生 fetch 封装（本文件私有 requestJson），不走 browserRequest：
 * browserRequest 在 401 时会 clearAuth + 跳转 /admin/login，而画布提交的
 * 401 是业务结果（访客未登录，提示登录引导即可），跳转与否由调用方
 * （DrawingGame）决定。解析规则与 browser.ts 一致（{code, data} 信封与
 * 裸数据都支持），错误统一抛 ApiError（status 原样保留供 409/429/422 分支）。
 */

export interface CanvasState {
  version: number;
  strokes: Stroke[];
  updated_at: string;
}

/** POST canvas 的 202 响应：进入人工审核队列。 */
export interface SubmissionAccepted {
  status: 'pending';
  submission_id: number;
}

/** POST canvas 的 200 响应：机审通过直接发布。 */
export interface SubmissionPublished {
  version: number;
  status: 'published';
}

/** 提交结果：调用方按 status/ApiError.status 分支展示终端文案。 */
export type SubmissionResult = SubmissionPublished | SubmissionAccepted;

/** 422 审核拒绝响应携带的原因（body: {"error":"rejected","reason":"graphic"|"ocr"}）。 */
export interface ModerationError extends ApiError {
  reason: 'graphic' | 'ocr';
}

/** 409 冲突响应携带的当前画布版本（body: {"error":"version conflict","current_version":N}）。 */
export interface VersionConflictError extends ApiError {
  currentVersion: number;
}

async function requestJson<T>(endpoint: string, init: RequestInit): Promise<T> {
  const response = await fetch(endpoint, init);
  const payload = (await response.json().catch(() => ({ message: response.statusText }))) as ApiEnvelope<T> & {
    current_version?: number;
    reason?: string;
  };
  if (!response.ok) {
    const error = new ApiError(response.status, getApiMessage(payload, 'Request failed'));
    // 契约扩展字段：409 携带 current_version；422 携带审核拒绝原因（ocr/graphic）。
    // 赋值前窄化到契约声明的枚举，非契约值不挂载（调用方按缺省分支处理）。
    if (response.status === 409 && typeof payload.current_version === 'number') {
      (error as VersionConflictError).currentVersion = payload.current_version;
    }
    if (
      response.status === 422 &&
      (payload.reason === 'ocr' || payload.reason === 'graphic')
    ) {
      (error as ModerationError).reason = payload.reason;
    }
    throw error;
  }
  return unwrapApiPayload(payload);
}

export const drawingApi = {
  /**
   * GET 公共画布（无需登录）。失败抛 ApiError，由调用方决定降级渲染。
   * 瞬时故障自动重试一次；两次都失败才向上抛。
   */
  getCanvas: async (): Promise<CanvasState> => {
    try {
      return await requestJson<CanvasState>(API_ENDPOINTS.PUBLIC.DRAWING_CANVAS, {});
    } catch (error) {
      if (error instanceof ApiError && error.status >= 500) {
        return requestJson<CanvasState>(API_ENDPOINTS.PUBLIC.DRAWING_CANVAS, {});
      }
      throw error;
    }
  },

  /**
   * 增量提交本机笔画。 Authorization 用 localStorage 的 `token`（登录态由
   * useSession 保证）；无 token 时仍发请求，由后端 401 统一裁决。
   */
  submitStrokes: (baseVersion: number | undefined, strokes: Stroke[]) => {
    if (typeof window === 'undefined') {
      return Promise.reject(new ApiError(0, 'client only'));
    }
    const token = window.localStorage.getItem('token') ?? '';
    return requestJson<SubmissionResult>(API_ENDPOINTS.PUBLIC.DRAWING_CANVAS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ base_version: baseVersion, strokes }),
    });
  },
};
