import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { Check, PenTool, RotateCw, X } from 'lucide-react';
import { PixelButton } from '@/components/pixel';
import useNotification from '@/hooks/useNotification';
import { ApiError } from '@/api/browser';
import { drawingApi } from '@/api/drawingApi';
import type { DrawingSubmission } from '@/api/drawingApi';
import { renderDrawing } from '@/games/drawing/drawingCanvas';
import type { Stroke } from '@/games/types';
import { describeError } from '../../utils/errors';
import {
  AdminEmptyState,
  AdminFieldGrid,
  AdminFieldGridItem,
  AdminFormStack,
  AdminPage,
  AdminSection,
} from '../ui';

// 状态过滤暂固定拉 pending；后端契约支持 status 参数（工单 #9 T5），后续可扩展为筛选控件。
const STATUS_FILTER = 'pending';
const PAGE_LIMIT = 50;
const PREVIEW_SIZE = 160;
// base 落后（409 superseded）时给审核员的过时提示。
const SUPERSEDED_NOTICE = '画布已前进，提交已作废：canvas moved ahead — submission voided';

/** strokes 是 JSON 字符串（T5 契约），解析失败按空笔画处理，不阻塞列表渲染。 */
function parseStrokes(raw: string): Stroke[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    // 只校验「是数组」：元素形状由 games 侧渲染函数按缺省值兜底（与迁移前一致）。
    return Array.isArray(parsed) ? (parsed as Stroke[]) : [];
  } catch {
    return [];
  }
}

interface StrokePreviewProps {
  strokes: Stroke[];
}

/** 笔画预览：0-1 相对坐标映射到小画布，渲染直接复用游戏侧纯函数 renderDrawing。 */
function StrokePreview({ strokes }: StrokePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    renderDrawing(ctx, { strokes }, { width: PREVIEW_SIZE, height: PREVIEW_SIZE }, dpr);
  }, [strokes, dpr]);

  if (strokes.length === 0) {
    return (
      <Box
        sx={{
          width: PREVIEW_SIZE,
          height: PREVIEW_SIZE,
          display: 'grid',
          placeItems: 'center',
          bgcolor: '#faf8f2',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          flexShrink: 0,
        }}
      >
        <Typography variant="caption" color="text.secondary">无笔画数据</Typography>
      </Box>
    );
  }

  return (
    <Box
      component="canvas"
      ref={canvasRef}
      width={PREVIEW_SIZE * dpr}
      height={PREVIEW_SIZE * dpr}
      sx={{
        width: PREVIEW_SIZE,
        height: PREVIEW_SIZE,
        bgcolor: '#faf8f2',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        flexShrink: 0,
      }}
    />
  );
}

interface SubmissionCardProps {
  submission: DrawingSubmission;
  busy: boolean;
  onApprove: (submission: DrawingSubmission) => void;
  onReject: (submission: DrawingSubmission) => void;
}

function SubmissionCard({ submission, busy, onApprove, onReject }: SubmissionCardProps) {
  const strokes = useMemo(() => parseStrokes(submission.strokes), [submission.strokes]);

  return (
    <AdminSection
      icon={<PenTool size={18} />}
      title={`提交 #${submission.id}`}
      subtitle={submission.created_at ? new Date(submission.created_at).toLocaleString() : ''}
      actions={
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <PixelButton
            color="success"
            size="small"
            startIcon={<Check size={16} />}
            disabled={busy}
            onClick={() => onApprove(submission)}
          >
            通过
          </PixelButton>
          <PixelButton
            color="error"
            size="small"
            startIcon={<X size={16} />}
            disabled={busy}
            onClick={() => onReject(submission)}
          >
            拒绝
          </PixelButton>
        </Stack>
      }
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'flex-start' } }}>
        <StrokePreview strokes={strokes} />
        <AdminFieldGrid sx={{ flex: 1, alignItems: 'center' }}>
          <AdminFieldGridItem size={{ xs: 12, sm: 4 }}>
            <Typography variant="body2">画布版本: v{submission.base_version}</Typography>
          </AdminFieldGridItem>
          <AdminFieldGridItem size={{ xs: 12, sm: 4 }}>
            <Typography variant="body2">作者: {submission.created_by}</Typography>
          </AdminFieldGridItem>
          {submission.reason ? (
            <AdminFieldGridItem size={{ xs: 12, sm: 4 }}>
              <Typography variant="body2">原因: {submission.reason}</Typography>
            </AdminFieldGridItem>
          ) : null}
        </AdminFieldGrid>
      </Stack>
    </AdminSection>
  );
}

type ReviewAction = 'approve' | 'reject';

/**
 * DrawingReviewManager - 画板人工审核页编排器（工单 #9 T9）。
 * 挂载拉取 pending 提交队列；通过/拒绝成功后从列表移除并刷新；
 * 409（base 落后 superseded）提示过时并移除该条目。
 */
export default function DrawingReviewManager() {
  const [submissions, setSubmissions] = useState<DrawingSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  // 只取动作函数：hook 返回的扁平函数引用稳定，可直接进 useCallback 依赖。
  const { success, error, warning } = useNotification();

  // initial=true 仅首次挂载展示 spinner；后续刷新走后台模式，
  // 列表保持可见，乐观移除的结果对用户即时可见。
  const fetchSubmissions = useCallback(async ({ initial = false }: { initial?: boolean } = {}) => {
    if (initial) setLoading(true);
    try {
      const data = await drawingApi.listSubmissions(STATUS_FILTER, PAGE_LIMIT);
      setSubmissions(Array.isArray(data?.submissions) ? data.submissions : []);
    } catch (cause) {
      error('获取待审列表失败: ' + describeError(cause));
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchSubmissions({ initial: true });
  }, [fetchSubmissions]);

  // approve/reject 共用流程：成功移除并刷新；409（base 落后）提示过时并移除。
  const reviewSubmission = async (submission: DrawingSubmission, action: ReviewAction) => {
    setBusyId(submission.id);
    try {
      await (action === 'approve'
        ? drawingApi.approve(submission.id)
        : drawingApi.reject(submission.id));
      setSubmissions((prev) => prev.filter((item) => item.id !== submission.id));
      success(action === 'approve' ? '已通过该提交' : '已拒绝该提交');
      await fetchSubmissions();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        setSubmissions((prev) => prev.filter((item) => item.id !== submission.id));
        warning(SUPERSEDED_NOTICE);
      } else {
        error('审核操作失败: ' + describeError(cause));
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleApprove = (submission: DrawingSubmission) => reviewSubmission(submission, 'approve');
  const handleReject = (submission: DrawingSubmission) => reviewSubmission(submission, 'reject');

  return (
    <AdminPage
      title="画板审核"
      subtitle="审核访客提交到公共画板的笔画"
      actions={
        <PixelButton
          variant="outline"
          startIcon={<RotateCw size={16} />}
          onClick={() => fetchSubmissions()}
          disabled={loading}
        >
          刷新
        </PixelButton>
      }
    >
      <AdminFormStack spacing={2}>
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : submissions.length > 0 ? (
          submissions.map((submission) => (
            <SubmissionCard
              key={submission.id}
              submission={submission}
              busy={busyId !== null}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))
        ) : (
          <AdminEmptyState title="暂无待审提交" />
        )}
      </AdminFormStack>
    </AdminPage>
  );
}
