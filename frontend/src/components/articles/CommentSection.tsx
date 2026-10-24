import { useState, useEffect, useCallback, useRef } from "react";
import type { ChangeEvent } from "react";
import {
	Typography,
	Box,
	Avatar,
	Divider,
	Grid,
	Alert,
	Snackbar,
} from "@mui/material";
import { Send as SendIcon } from "@mui/icons-material";
import { API_ENDPOINTS } from "../../api/endpoints";
import { ApiError, browserApi } from "../../api/browser";
import { authApi } from "../../api/authApi";
import type { Comment, CommentPage } from "../../api/types";
import { formatDateTime } from "../../utils/formatDate";
import {
	PixelCard,
	PixelButton,
	PixelInput,
	PixelDialog,
	PixelTypography,
} from "../pixel";
import useNotification from "../../hooks/useNotification";
import { useSession } from "../../hooks/useSession";

// ---- 评论草稿（localStorage，命名空间 comment:draft:<articleId>）----
// 与画板草稿 game:drawing:draft 同模式：防抖自动保存、隐私模式静默降级。
const DRAFT_SAVE_DEBOUNCE_MS = 500;

interface CommentDraft {
	articleId: number;
	content: string;
}

function loadCommentDraft(articleId: number): string | null {
	if (typeof window === "undefined") return null;
	try {
		return window.localStorage.getItem(`comment:draft:${articleId}`);
	} catch {
		return null; // 隐私模式等：静默降级
	}
}

function saveCommentDraft(articleId: number, content: string): void {
	if (typeof window === "undefined") return;
	try {
		const key = `comment:draft:${articleId}`;
		if (content) {
			window.localStorage.setItem(key, content);
		} else {
			window.localStorage.removeItem(key);
		}
	} catch {
		// 隐私模式/配额满：静默降级，不打断输入
	}
}

// 整页跳转 GitHub 登录：模块级函数持有对 window.location 的修改，
// 便于测试桩替换（模式同 TerminalCommandBar）。
function redirectToGithubLogin(): void {
	const redirectTo = `${window.location.pathname}${window.location.search}`;
	window.location.href = authApi.buildGithubAuthorizeUrl(redirectTo);
}

export interface CommentSectionProps {
	/** 文章 id，决定评论接口与草稿命名空间。 */
	articleId: number;
	/** 演示模式：不发请求、不允许输入（仅展示占位与提示）。 */
	demoMode?: boolean;
}

/**
 * 文章评论区组件。
 * 从 ArticleDetail 中提取，包含评论表单、评论列表和相关状态管理。
 * 评论需登录（P2 决策 1/3/5）：guest 提交只弹登录提醒（不发请求），
 * 草稿自动保存/恢复；身份一律来自会话（GitHub 或 admin），无手填昵称。
 */
export default function CommentSection({
	articleId,
	demoMode = false,
}: CommentSectionProps) {
	const [comments, setComments] = useState<Comment[]>([]);
	const [commentsLoading, setCommentsLoading] = useState(false);
	const [submittingComment, setSubmittingComment] = useState(false);
	const [newComment, setNewComment] = useState("");
	const [signInOpen, setSignInOpen] = useState(false);
	const notify = useNotification();
	const session = useSession();

	const authedUser = session.status === "authed" ? session.user : null;
	const isGithub = authedUser?.provider === "github";
	const githubAuthor =
		isGithub && authedUser
			? authedUser.display_name || authedUser.username || ""
			: "";

	const fetchComments = useCallback(async (): Promise<void> => {
		if (!articleId || demoMode) return;

		try {
			setCommentsLoading(true);
			const payload = await browserApi.get<CommentPage>(
				API_ENDPOINTS.PUBLIC.ARTICLE_COMMENTS(articleId),
			);
			setComments(payload?.comments || []);
		} catch (error) {
			console.error("获取评论失败:", error);
		} finally {
			setCommentsLoading(false);
		}
	}, [articleId, demoMode]);

	useEffect(() => {
		fetchComments();
	}, [fetchComments]);

	// 草稿：挂载/文章切换时恢复（含 GitHub 登录跳回）。
	// 微任务内 setState 满足 react-hooks/set-state-in-effect；active 守卫防 StrictMode 双挂载竞态。
	useEffect(() => {
		let active = true;
		void Promise.resolve().then(() => {
			if (!active || demoMode) return;
			const saved = loadCommentDraft(articleId);
			if (saved != null) setNewComment(saved);
		});
		return () => {
			active = false;
		};
	}, [articleId, demoMode]);

	// 草稿：输入防抖自动保存；卸载时 flush 防抖窗口内的内容（路由切换兜底）。
	const draftRef = useRef<CommentDraft | null>(null);
	useEffect(() => {
		draftRef.current = { articleId, content: newComment };
		if (demoMode) return;
		const timer = setTimeout(() => {
			saveCommentDraft(articleId, newComment);
		}, DRAFT_SAVE_DEBOUNCE_MS);
		return () => clearTimeout(timer);
	}, [newComment, articleId, demoMode]);

	useEffect(() => {
		return () => {
			const draft = draftRef.current;
			if (draft?.content) saveCommentDraft(draft.articleId, draft.content);
		};
	}, []);

	const handleSubmitComment = async (): Promise<void> => {
		const content = newComment.trim();
		if (!content || demoMode) return;

		// guest（未登录）：弹登录提醒，不发任何请求；草稿已自动保存。
		if (!authedUser) {
			setSignInOpen(true);
			return;
		}

		try {
			setSubmittingComment(true);
			await browserApi.post<unknown>(
				API_ENDPOINTS.PUBLIC.CREATE_COMMENT(articleId),
				{
					author: isGithub ? githubAuthor : authedUser.username,
					// 会话用户（/api/auth/me、登录响应）从不带 email，字段恒为空串；
					// 保留字段是为了后端请求体契约不变（后端按 email 做风控分类）。
					email: "",
					avatar_url: isGithub ? authedUser.avatar_url || "" : "",
					content,
				},
			);

			setNewComment("");
			saveCommentDraft(articleId, "");
			await fetchComments();
			notify.success("评论发布成功！");
		} catch (error) {
			if (error instanceof ApiError && error.status === 429) {
				notify.warning(
					error.message || "评论发布频率过高，请稍后再试",
				);
			} else if (error instanceof ApiError && error.status === 401) {
				// 会话过期竞态兜底：展示服务端消息（browserRequest 已 clearAuth 并回首页）。
				notify.warning(error.message || "请先登录后再评论");
			} else {
				console.error("提交评论失败:", error);
				notify.error("评论发布失败，请稍后重试");
			}
		} finally {
			setSubmittingComment(false);
		}
	};

	const handleSignIn = (): void => {
		// 跳转前立即落盘：登录跳回后草稿原样恢复（防抖窗口内的输入不丢）。
		saveCommentDraft(articleId, newComment);
		redirectToGithubLogin();
	};

	return (
		<>
			<PixelCard>
				<Typography variant="h5" gutterBottom sx={{ fontFamily: "monospace" }}>
					$ comments --list ({comments.length})
				</Typography>

				{/* 发表评论 */}
				<Box sx={{ mb: 4 }}>
					{demoMode && (
						<Alert severity="warning" sx={{ mb: 2 }}>
							演示模式下评论功能不可用，请启动后端服务后重试。
						</Alert>
					)}

					<Grid container spacing={2} sx={{ mb: 2 }}>
						<Grid size={{ xs: 12, sm: 6 }}>
							{authedUser ? (
								<Box
									sx={{
										display: "flex",
										alignItems: "center",
										gap: 1,
										minHeight: 56,
									}}
								>
									{isGithub ? (
										<Avatar
											src={authedUser.avatar_url || undefined}
											sx={{ width: 32, height: 32 }}
										>
											{githubAuthor.charAt(0)}
										</Avatar>
									) : (
										<Avatar
											sx={{ width: 32, height: 32, bgcolor: "primary.main" }}
										>
											{authedUser.username.charAt(0)}
										</Avatar>
									)}
									<Typography
										variant="body2"
										sx={{ fontFamily: "monospace", color: "text.secondary" }}
									>
										$ name {isGithub ? githubAuthor : authedUser.username}{" "}
										({isGithub ? "github" : "admin"})
									</Typography>
								</Box>
							) : (
								<Typography
									variant="body2"
									sx={{
										fontFamily: "monospace",
										color: "text.secondary",
										minHeight: 56,
										display: "flex",
										alignItems: "center",
									}}
								>
									// not signed in
								</Typography>
							)}
						</Grid>
					</Grid>

					<PixelInput
						fullWidth
						multiline
						rows={3}
						label="$ message"
						value={newComment}
						onChange={(
							e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
						) => setNewComment(e.target.value)}
						disabled={demoMode}
						sx={{ mb: 2 }}
					/>

					<PixelButton
						variant="primary"
						startIcon={<SendIcon />}
						disabled={
							demoMode || !newComment.trim() || submittingComment
						}
						onClick={handleSubmitComment}
					>
						{submittingComment ? "> submitting..." : "> submit"}
					</PixelButton>
				</Box>

				<Divider sx={{ mb: 3, borderColor: "divider" }} />

				{/* 评论列表 */}
				{commentsLoading ? (
					<Box sx={{ py: 2, textAlign: "center" }}>
						<Typography color="text.secondary">loading...</Typography>
					</Box>
				) : comments.length > 0 ? (
					<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
						{comments.map((comment) => (
							<Box key={comment.id} sx={{ display: "flex", gap: 2 }}>
								<Avatar
									src={comment.avatar_url || undefined}
									sx={{ width: 40, height: 40, bgcolor: "primary.main" }}
								>
									{!comment.avatar_url && comment.author.charAt(0)}
								</Avatar>
								<Box sx={{ flex: 1 }}>
									<Box
										sx={{
											display: "flex",
											alignItems: "center",
											gap: 2,
											mb: 1,
										}}
									>
										{/* MUI v9 已废弃 system props：原先的 fontWeight="bold" 只会落成一个
										    不生效的 DOM 属性，转换时移除（要真加粗需显式写 sx）。 */}
										<Typography
											variant="subtitle2"
											sx={{ fontFamily: "monospace" }}
										>
											{comment.author}
										</Typography>
										<Typography variant="caption" color="text.secondary">
											{formatDateTime(comment.created_at ?? "")}
										</Typography>
									</Box>
									<Typography
										variant="body2"
										sx={{ lineHeight: 1.6, fontFamily: "monospace" }}
									>
										{comment.content}
									</Typography>
								</Box>
							</Box>
						))}
					</Box>
				) : (
					<Typography
						variant="body2"
						color="text.secondary"
						sx={{ fontFamily: "monospace", textAlign: "center" }}
					>
						// no comments yet
					</Typography>
				)}
			</PixelCard>

			<PixelDialog
				open={signInOpen}
				title="sign in required"
				onClose={() => setSignInOpen(false)}
				actions={
					<>
						<PixelButton
							variant="ghost"
							onClick={() => setSignInOpen(false)}
						>
							not now
						</PixelButton>
						<PixelButton variant="primary" onClick={handleSignIn}>
							sign in
						</PixelButton>
					</>
				}
			>
				{/* 登录方式不限于 GitHub（密码登录为保留方式），文案不写死提供商；
				    不用 muted（#484f58 对比度仅 ~2.2:1），正文用 text.secondary 保证可读。 */}
				<PixelTypography
					variant="body2"
					code
					sx={{ color: "text.secondary" }}
				>
					comments require sign-in. your draft is saved.
				</PixelTypography>
			</PixelDialog>

			<Snackbar
				open={notify.open}
				autoHideDuration={3000}
				onClose={notify.hide}
				message={notify.message}
			/>
		</>
	);
}
