import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { Check, PenTool, RotateCw, X } from 'lucide-react';
import useNotification from '@/hooks/useNotification';
import { API_ENDPOINTS, ApiError, api } from '@/config/api';
import { renderDrawing } from '@/games/drawing/drawingCanvas';
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
function parseStrokes(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** 笔画预览：0-1 相对坐标映射到小画布，渲染直接复用游戏侧纯函数 renderDrawing。 */
function StrokePreview({ strokes }) {
  const canvasRef = useRef(null);
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

function SubmissionCard({ submission, busy, onApprove, onReject }) {
  const strokes = useMemo(() => parseStrokes(submission.strokes), [submission.strokes]);

  return (
    <AdminSection
      icon={<PenTool size={18} />}
      title={`提交 #${submission.id}`}
      subtitle={submission.created_at ? new Date(submission.created_at).toLocaleString() : ''}
      actions={
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="success"
            size="small"
            startIcon={<Check size={16} />}
            disabled={busy}
            onClick={() => onApprove(submission)}
          >
            通过
          </Button>
          <Button
            variant="contained"
            color="error"
            size="small"
            startIcon={<X size={16} />}
            disabled={busy}
            onClick={() => onReject(submission)}
          >
            拒绝
          </Button>
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

/**
 * DrawingReviewManager - 画板人工审核页编排器（工单 #9 T9）。
 * 挂载拉取 pending 提交队列；通过/拒绝成功后从列表移除并刷新；
 * 409（base 落后 superseded）提示过时并移除该条目。
 */
export default function DrawingReviewManager() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const { notify } = useNotification();

  // initial=true 仅首次挂载展示 spinner；后续刷新走后台模式，
  // 列表保持可见，乐观移除的结果对用户即时可见。
  const fetchSubmissions = useCallback(async ({ initial = false } = {}) => {
    if (initial) setLoading(true);
    try {
      const query = new URLSearchParams({ status: STATUS_FILTER, limit: String(PAGE_LIMIT) });
      const data = await api.get(`${API_ENDPOINTS.ADMIN.DRAWING_SUBMISSIONS}?${query.toString()}`);
      setSubmissions(Array.isArray(data?.submissions) ? data.submissions : []);
    } catch (error) {
      notify().error('获取待审列表失败: ' + (error?.message || error));
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    fetchSubmissions({ initial: true });
  }, [fetchSubmissions]);

  // approve/reject 共用流程：成功移除并刷新；409（base 落后）提示过时并移除。
  const reviewSubmission = async (submission, action) => {
    const endpoint = action === 'approve'
      ? API_ENDPOINTS.ADMIN.DRAWING_SUBMISSION_APPROVE(submission.id)
      : API_ENDPOINTS.ADMIN.DRAWING_SUBMISSION_REJECT(submission.id);
    setBusyId(submission.id);
    try {
      await api.post(endpoint);
      setSubmissions((prev) => prev.filter((item) => item.id !== submission.id));
      notify().success(action === 'approve' ? '已通过该提交' : '已拒绝该提交');
      await fetchSubmissions();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setSubmissions((prev) => prev.filter((item) => item.id !== submission.id));
        notify().warning(SUPERSEDED_NOTICE);
      } else {
        notify().error('审核操作失败: ' + (error?.message || error));
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleApprove = (submission) => reviewSubmission(submission, 'approve');
  const handleReject = (submission) => reviewSubmission(submission, 'reject');

  return (
    <AdminPage
      title="画板审核"
      subtitle="审核访客提交到公共画板的笔画"
      actions={
        <Button
          variant="outlined"
          startIcon={<RotateCw size={16} />}
          onClick={() => fetchSubmissions()}
          disabled={loading}
        >
          刷新
        </Button>
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
