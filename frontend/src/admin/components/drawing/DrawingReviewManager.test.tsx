import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DrawingReviewManager from './DrawingReviewManager';
import type { DrawingSubmission } from '@/api/drawingApi';

const notifyMethods = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
}));

const drawingApiMocks = vi.hoisted(() => ({
  listSubmissions: vi.fn(),
  approve: vi.fn(),
  reject: vi.fn(),
}));

// Mock 域层（组件只用到 drawingApi 三个函数；ApiError 用真实的）
vi.mock('@/api/drawingApi', () => ({ drawingApi: drawingApiMocks }));

// Mock useNotification（动作函数需稳定标识，避免依赖变化触发反复拉取）
vi.mock('@/hooks/useNotification', () => ({
  default: () => ({
    open: false,
    message: '',
    severity: 'info',
    success: notifyMethods.success,
    error: notifyMethods.error,
    info: notifyMethods.info,
    warning: notifyMethods.warning,
    show: vi.fn(),
    hide: vi.fn(),
  }),
}));
import { ApiError } from '@/api/browser';

const makeStrokes = () =>
  JSON.stringify([
    {
      id: 'stroke-1',
      color: '#e63946',
      width: 0.02,
      points: [
        { x: 0.1, y: 0.1, t: 1 },
        { x: 0.9, y: 0.9, t: 2 },
      ],
    },
  ]);

const makeSubmission = (overrides: Partial<DrawingSubmission> = {}): DrawingSubmission => ({
  id: 1,
  base_version: 3,
  strokes: makeStrokes(),
  status: 'pending',
  reason: '',
  created_by: 'alice',
  created_at: '2026-03-23T10:00:00Z',
  ...overrides,
});

/** 让动作后的刷新永不返回：乐观移除必须由组件自己完成，刷新掩盖不了它。 */
function pendingAfterAction() {
  drawingApiMocks.listSubmissions.mockImplementation(() => new Promise(() => {}));
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem('token', 'test-token');
  // jsdom 无 2d 上下文：stub 掉，预览画布渲染不崩即可（渲染逻辑本身归 games 侧测试管）
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('DrawingReviewManager', () => {
  it('渲染待审队列：条目数、作者、版本、原因、时间', async () => {
    drawingApiMocks.listSubmissions.mockResolvedValue({
      submissions: [
        makeSubmission({ id: 11, reason: 'graphic', created_by: 'alice' }),
        makeSubmission({ id: 22, base_version: 5, created_by: 'bob' }),
      ],
      total: 2,
    });

    render(<DrawingReviewManager />);

    expect(await screen.findByText('提交 #11')).toBeInTheDocument();
    expect(screen.getByText('提交 #22')).toBeInTheDocument();
    expect(screen.getByText('作者: alice')).toBeInTheDocument();
    expect(screen.getByText('作者: bob')).toBeInTheDocument();
    expect(screen.getByText('画布版本: v3')).toBeInTheDocument();
    expect(screen.getByText('画布版本: v5')).toBeInTheDocument();
    expect(screen.getByText('原因: graphic')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '通过' }).length).toBe(2);
    expect(screen.getAllByRole('button', { name: '拒绝' }).length).toBe(2);
  });

  it('点击通过后条目立即移除（乐观移除，不依赖刷新结果）', async () => {
    drawingApiMocks.listSubmissions.mockResolvedValueOnce({ submissions: [makeSubmission({ id: 7 })], total: 1 });
    drawingApiMocks.approve.mockResolvedValue({ id: 7, status: 'approved' });

    render(<DrawingReviewManager />);
    expect(await screen.findByText('提交 #7')).toBeInTheDocument();

    // 动作成功后的刷新挂起：列表不重拉，移除必须来自组件自身的乐观更新
    pendingAfterAction();
    fireEvent.click(screen.getByRole('button', { name: '通过' }));

    await waitFor(() => {
      expect(screen.queryByText('提交 #7')).not.toBeInTheDocument();
    });
    expect(notifyMethods.success).toHaveBeenCalled();
  });

  it('点击拒绝后条目立即移除（乐观移除，不依赖刷新结果）', async () => {
    drawingApiMocks.listSubmissions.mockResolvedValueOnce({ submissions: [makeSubmission({ id: 9 })], total: 1 });
    drawingApiMocks.reject.mockResolvedValue({ id: 9, status: 'rejected' });

    render(<DrawingReviewManager />);
    expect(await screen.findByText('提交 #9')).toBeInTheDocument();

    pendingAfterAction();
    fireEvent.click(screen.getByRole('button', { name: '拒绝' }));

    await waitFor(() => {
      expect(screen.queryByText('提交 #9')).not.toBeInTheDocument();
    });
  });

  it('通过时 409（base 落后）→ 提示过时并移除条目', async () => {
    drawingApiMocks.listSubmissions.mockResolvedValue({ submissions: [makeSubmission({ id: 4 })], total: 1 });
    drawingApiMocks.approve.mockRejectedValue(new ApiError(409, 'base version superseded'));

    render(<DrawingReviewManager />);
    expect(await screen.findByText('提交 #4')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '通过' }));

    await waitFor(() => {
      expect(notifyMethods.warning).toHaveBeenCalledWith(
        '画布已前进，提交已作废：canvas moved ahead — submission voided',
      );
    });
    expect(screen.queryByText('提交 #4')).not.toBeInTheDocument();
  });

  it('队列为空时显示空态', async () => {
    drawingApiMocks.listSubmissions.mockResolvedValue({ submissions: [], total: 0 });

    render(<DrawingReviewManager />);

    expect(await screen.findByText('暂无待审提交')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '通过' })).not.toBeInTheDocument();
  });

  it('加载失败时展示错误提示', async () => {
    drawingApiMocks.listSubmissions.mockRejectedValue(new Error('network down'));

    render(<DrawingReviewManager />);

    await waitFor(() => {
      expect(notifyMethods.error).toHaveBeenCalledWith('获取待审列表失败: network down');
    });
  });
});
