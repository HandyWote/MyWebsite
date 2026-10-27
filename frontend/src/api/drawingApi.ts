import { API_ENDPOINTS } from './endpoints';
import { browserApi } from './browser';
import { ApiError, parseApiPayload, type ApiEnvelope } from './response';
import type { Stroke } from '@/games/types';

/**
 * 画板 API（P1 审核链，冻结契约见工单 #9 T8）。
 *
 * 传输分两条，按 401 语义区分：
 * - 公共画布（getCanvas/submitStrokes）走本文件私有 requestJson 的原生 fetch：
 *   browserRequest 在 401 时会 clearAuth + 跳转 /admin/login，而画布提交的
 *   401 是业务结果（访客未登录，提示登录引导即可），跳转与否由调用方
 *   （DrawingGame）决定。解析交给共享的 `parseApiPayload`（信封拆包 + HTTP/
 *   业务 code 双判），错误统一抛 ApiError（status 原样保留供 409/429/422 分支），
 *   原始响应体挂在 error.body 供契约扩展字段读取。
 * - 管理端审核（listSubmissions/approve/reject）走 browserApi：这些端点的
 *   401 就是"管理员登录态失效"，由 browserRequest 统一 clearAuth + 跳登录。
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

/** 管理端待审投稿条目（ADMIN.DRAWING_SUBMISSIONS 的 items，契约见工单 #9 T5）。 */
export interface DrawingSubmission {
  id: number;
  base_version: number;
  /** 增量笔画 JSON 字符串（T5 契约），解析归调用方。 */
  strokes: string;
  status: 'pending' | 'approved' | 'rejected' | 'superseded' | string;
  reason?: string;
  created_by?: string;
  reviewed_by?: string;
  created_at?: string;
  reviewed_at?: string | null;
}

/** 待审队列响应：列表 + 全量总数（total 不受 limit 截断）。 */
export interface DrawingSubmissionPage {
  submissions?: DrawingSubmission[];
  total?: number;
}

/** 审核动作结果：approve 返回投稿 id 与新状态，reject 只推进状态。 */
export interface SubmissionReviewResult {
  id?: number;
  status?: string;
}

async function requestJson<T>(endpoint: string, init: RequestInit): Promise<T> {
  const response = await fetch(endpoint, init);
  const payload = (await response.json().catch(() => ({ message: response.statusText }))) as ApiEnvelope<T>;
  try {
    return parseApiPayload<T>(payload, {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
    });
  } catch (error) {
    if (error instanceof ApiError) attachContractFields(error);
    throw error;
  }
}

/**
 * 契约扩展字段从 `error.body` 读：409 携带 current_version；422 携带审核拒绝原因。
 * 赋值前窄化到契约声明的枚举，非契约值不挂载（调用方按缺省分支处理）。
 */
function attachContractFields(error: ApiError): void {
  const body = (error.body ?? {}) as { current_version?: unknown; reason?: unknown };
  if (error.status === 409 && typeof body.current_version === 'number') {
    (error as VersionConflictError).currentVersion = body.current_version;
  }
  if (error.status === 422 && (body.reason === 'ocr' || body.reason === 'graphic')) {
    (error as ModerationError).reason = body.reason;
  }
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

  /**
   * GET 管理端待审队列。status 为空串表示不过滤（后端契约），limit 为截断条数。
   * 失败抛 ApiError（401 由 browserRequest 统一跳登录）。
   */
  listSubmissions: (status: string, limit: number): Promise<DrawingSubmissionPage> => {
    const query = new URLSearchParams({ status, limit: String(limit) }).toString();
    return browserApi.get<DrawingSubmissionPage>(
      `${API_ENDPOINTS.ADMIN.DRAWING_SUBMISSIONS}?${query}`,
    );
  },

  /** POST 通过投稿：base 落后时后端 409（投稿被判 superseded）。 */
  approve: (id: number | string): Promise<SubmissionReviewResult> =>
    browserApi.post<SubmissionReviewResult>(API_ENDPOINTS.ADMIN.DRAWING_SUBMISSION_APPROVE(id)),

  /** POST 拒绝投稿：非 pending 状态后端 400。 */
  reject: (id: number | string): Promise<SubmissionReviewResult> =>
    browserApi.post<SubmissionReviewResult>(API_ENDPOINTS.ADMIN.DRAWING_SUBMISSION_REJECT(id)),
};
