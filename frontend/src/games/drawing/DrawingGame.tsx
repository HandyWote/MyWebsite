"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { ChevronLeft, ChevronRight, Eraser, Redo, Trash2, Undo } from "lucide-react";
import type { Drawing, GameViewProps, Stroke } from "../types";
import {
	BRUSH_WIDTHS,
	DEFAULT_WIDTH,
	ERASER_COLOR,
	PALETTE,
	createStroke,
	pixelToLocal,
	pointToLocal,
	renderDrawing,
} from "./drawingCanvas";
import { clearDraft, flushDraft, loadDraft, scheduleSave } from "./draftStore";

/**
 * 画板游戏本体（P0 计划 Task 5 / G4）。
 * - 根 div 铺满宿主（#paper-screen-host），ResizeObserver 兜底尺寸
 *   （PaperScreen 接管前可能为 0，接管后 RO 触发重绘）。
 * - pointer 事件归一化为 0-1 相对坐标：优先 offsetX/offsetY（浏览器对
 *   transform 元素命中测试的精确逆投影，含透视/面内旋转）除以画布局
 *   尺寸；offset 不可用时回退 clientX/Y + getBoundingClientRect 线性
 *   映射。存储结构与 P1 上传契约一致。
 * - 工具面板：顶部居中悬浮半透明卡（原视觉），默认收起成小扁胶囊
 *   （卡里只剩开关钮），点击原地丝滑展开为单行面板（max-width/
 *   opacity/visibility 过渡）；画布铺满整纸、尺寸永不因面板变化。
 * - 笔刷/橡皮/撤销/重做/清空 + localStorage 草稿（挂载静默恢复，
 *   无按钮 toast 告知“存在本机、未上传”）；提交为禁用占位（P1）。
 * - 无任何网络请求。
 */

const ZERO_SIZE = { width: 0, height: 0 };

const rootStyle: CSSProperties = {
	position: "relative",
	width: "100%",
	height: "100%",
	overflow: "hidden",
	touchAction: "none",
	userSelect: "none",
};

const canvasStyle: CSSProperties = {
	position: "absolute",
	inset: 0,
	width: "100%",
	height: "100%",
	touchAction: "none",
};

/** 工具面板卡：顶部居中悬浮，半透明暖色底透出纸纹（原视觉）。
 *  尺寸随内容——收起时内容行宽 0，卡缩成只剩开关钮的小扁胶囊
 *  （同一元素的两种形态，原地展开/收起）。 */
const toolbarStyle: CSSProperties = {
	position: "absolute",
	top: 6,
	left: "50%",
	transform: "translateX(-50%)",
	zIndex: 1,
	display: "flex",
	alignItems: "center",
	flexWrap: "nowrap",
	gap: 4,
	padding: "3px 4px",
	borderRadius: 16,
	background: "rgba(255, 251, 240, 0.18)",
	border: "1px solid rgba(38, 70, 83, 0.16)",
	boxShadow: "0 1px 4px rgba(0, 0, 0, 0.12)",
};

/** 展开态内容行的目标宽度（px，收起时为 0）：单行 nowrap +
 *  overflow hidden，过渡时从中心向两侧展开；visibility 随收起翻
 *  hidden，保证工具退出无障碍树与命中区。 */
const TOOLS_ROW_MAX_WIDTH = 560;

const toolsRowStyle: CSSProperties = {
	display: "flex",
	alignItems: "center",
	flexWrap: "nowrap",
	gap: 4,
	minWidth: 0,
	overflow: "hidden",
	transition:
		"max-width 200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 160ms ease, visibility 160ms linear",
};

const toolButtonStyle: CSSProperties = {
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	width: 26,
	height: 26,
	padding: 0,
	boxSizing: "border-box",
	borderRadius: 8,
	border: "2px solid transparent",
	background: "rgba(38, 70, 83, 0.1)",
	boxShadow: "inset 0 0 0 1px rgba(38, 70, 83, 0.22)",
	fontSize: 14,
	lineHeight: 1,
	color: "#264653",
	cursor: "pointer",
};

const dividerStyle: CSSProperties = {
	width: 1,
	height: 18,
	margin: "0 2px",
	background: "rgba(38, 70, 83, 0.28)",
};

/** 开关钮：扁胶囊（44×26），与面板同一套半透明暖色视觉；
 *  展开后停靠面板行尾（chevron 向下=收起）。 */
const toggleButtonStyle: CSSProperties = {
	...toolButtonStyle,
	width: 44,
	height: 26,
	borderRadius: 999,
	background: "rgba(255, 251, 240, 0.4)",
};

/** 草稿恢复 toast 的显示时长：出现后自动消失。 */
const DRAFT_TOAST_MS = 4000;

/** 草稿恢复 toast：绝对定位悬于画布底部水平居中，pointerEvents:
 *  none 绝不拦截绘制；自带底色/描边/投影，无任何按钮。 */
const draftToastStyle: CSSProperties = {
	position: "absolute",
	bottom: 12,
	left: "50%",
	transform: "translateX(-50%)",
	zIndex: 2,
	pointerEvents: "none",
	maxWidth: "96%",
	padding: "8px 14px",
	borderRadius: 10,
	background: "rgba(244, 236, 216, 0.95)",
	border: "1px solid rgba(38, 70, 83, 0.35)",
	boxShadow: "0 2px 10px rgba(0, 0, 0, 0.18)",
	textAlign: "center",
	fontSize: 13,
	fontWeight: 600,
	color: "#264653",
};

export function DrawingGame({ host }: GameViewProps) {
	const rootRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	/** 进行中笔画的同步镜像：pointerup 后同帧可能再触发 pointerleave，
	 *  用 ref 保证只提交一次（React 状态在事件间已刷新，但同帧二次事件
	 *  仍会读到旧闭包）。 */
	const currentRef = useRef<Stroke | null>(null);
	/** 用户是否对画布有未落盘的修改（画/撤销/重做置 true；清空视为
	 *  弃稿重置为 false）：只在这些时候写草稿，避免覆盖既有草稿或
	 *  为从未动笔的访问者落盘空数据。 */
	const touchedRef = useRef(false);

	const [size, setSize] = useState(() =>
		typeof window === "undefined" ? ZERO_SIZE : host.getSize(),
	);
	/** 草稿：挂载时读取一次（只挂到桌面纸面上，纯客户端，无 SSR）。
	 *  有笔画则静默恢复——直接载入立即可继续画，不置 touchedRef
	 *  （不主动写盘，用户动笔后照常防抖保存），只弹一条无按钮 toast
	 *  告知“存在本机、未上传”。用惰性初始化而非 effect，避免级联渲染。 */
	const [restoredDraft] = useState<Drawing | null>(() => {
		const draft = loadDraft();
		return draft !== null && draft.strokes.length > 0 ? draft : null;
	});
	const [strokes, setStrokes] = useState<Stroke[]>(
		() => restoredDraft?.strokes ?? [],
	);
	const [current, setCurrent] = useState<Stroke | null>(null);
	/** 历史快照栈：past = 可撤销的历史，future = 可重做的未来。 */
	const [past, setPast] = useState<Stroke[][]>([]);
	const [future, setFuture] = useState<Stroke[][]>([]);
	const [color, setColor] = useState<string>(PALETTE[0]);
	const [width, setWidth] = useState<number>(DEFAULT_WIDTH);
	const [erasing, setErasing] = useState(false);
	/** 草稿恢复 toast：出现 DRAFT_TOAST_MS 后自动消失。 */
	const [draftToastVisible, setDraftToastVisible] = useState(
		restoredDraft !== null,
	);
	/** 工具栏（页眉条）默认收起：纸面只见右上角开关钮，点击展开。 */
	const [toolsOpen, setToolsOpen] = useState(false);

	// —— 尺寸：ResizeObserver 兜底（缺失时仅用初始尺寸）——
	useEffect(() => {
		const root = rootRef.current;
		if (!root || typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (!entry) return;
			const { width: w, height: h } = entry.contentRect;
			setSize({ width: w, height: h });
		});
		observer.observe(root);
		return () => observer.disconnect();
	}, [host]);

	// —— 草稿：strokes 变化时防抖保存（用户动过笔才落盘）——
	useEffect(() => {
		if (!touchedRef.current) return;
		scheduleSave({ strokes });
	}, [strokes]);

	// —— 草稿：卸载/路由切换时立即写入未决保存 ——
	useEffect(() => {
		return () => {
			flushDraft();
		};
	}, []);

	// —— 草稿 toast：出现后计时自动消失（卸载/隐藏时清理定时器）——
	useEffect(() => {
		if (!draftToastVisible) return;
		const timer = setTimeout(
			() => setDraftToastVisible(false),
			DRAFT_TOAST_MS,
		);
		return () => clearTimeout(timer);
	}, [draftToastVisible]);

	// —— 绘制：strokes + 进行中笔画 + 尺寸变化时全量重绘 ——
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || size.width <= 0 || size.height <= 0) return;
		const dpr = window.devicePixelRatio || 1;
		const deviceWidth = Math.round(size.width * dpr);
		const deviceHeight = Math.round(size.height * dpr);
		if (canvas.width !== deviceWidth) canvas.width = deviceWidth;
		if (canvas.height !== deviceHeight) canvas.height = deviceHeight;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const drawing: Drawing = current
			? { strokes: [...strokes, current] }
			: { strokes };
		renderDrawing(ctx, drawing, size, dpr);
	}, [strokes, current, size]);

	const localPoint = (e: ReactPointerEvent): { x: number; y: number } | null => {
		const target = canvasRef.current;
		if (!target) return null;
		const { offsetX, offsetY } = e.nativeEvent;
		// 主路径：offset 是浏览器对 transform 元素（含 CSS3D 透视/面内旋转）
		// 命中测试的精确逆投影，本身就是画布局部坐标；除以未变换的布局
		// 尺寸即得相对坐标。布局尺寸拿不到（未布局/无布局引擎环境）时退
		// 回 rect 尺寸。offset 非有限数值（旧环境/合成事件）时回退 client
		// 坐标 + AABB rect 线性映射（仅无 transform 时准确）。
		if (Number.isFinite(offsetX) && Number.isFinite(offsetY)) {
			let width = target.clientWidth;
			let height = target.clientHeight;
			if (width <= 0 || height <= 0) {
				const rect = target.getBoundingClientRect();
				width = rect.width;
				height = rect.height;
			}
			return pixelToLocal(offsetX, offsetY, width, height);
		}
		return pointToLocal(e.clientX, e.clientY, target.getBoundingClientRect());
	};

	const handlePointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
		if (e.button !== 0 || e.isPrimary === false) return;
		if (currentRef.current) return;
		e.preventDefault();
		const point = localPoint(e);
		if (!point) return;
		const stroke = createStroke(erasing ? ERASER_COLOR : color, width, [
			{ ...point, t: Date.now() },
		]);
		currentRef.current = stroke;
		setCurrent(stroke);
		// 特性守卫：不支持 setPointerCapture 的环境（旧浏览器/jsdom）静默跳过
		e.currentTarget.setPointerCapture?.(e.pointerId);
	};

	const handlePointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
		const stroke = currentRef.current;
		if (!stroke) return;
		const point = localPoint(e);
		if (!point) return;
		// ref 与 state 同步推进：finishStroke 以 ref 为准提交，必须拿到完整轨迹
		const next = {
			...stroke,
			points: [...stroke.points, { ...point, t: Date.now() }],
		};
		currentRef.current = next;
		setCurrent(next);
	};

	const finishStroke = () => {
		const stroke = currentRef.current;
		if (!stroke) return;
		currentRef.current = null;
		touchedRef.current = true;
		setCurrent(null);
		setPast((prev) => [...prev, strokes]);
		setFuture([]);
		setStrokes((prev) => [...prev, stroke]);
	};

	const handleUndo = () => {
		const last = past[past.length - 1];
		if (!last) return;
		touchedRef.current = true;
		setFuture((prev) => [...prev, strokes]);
		setPast((prev) => prev.slice(0, -1));
		setStrokes(last);
	};

	const handleRedo = () => {
		const next = future[future.length - 1];
		if (!next) return;
		touchedRef.current = true;
		setPast((prev) => [...prev, strokes]);
		setFuture((prev) => prev.slice(0, -1));
		setStrokes(next);
	};

	const handleClear = () => {
		if (strokes.length === 0) return;
		// 清空 = 弃稿：重置 untouched（strokes effect 不会把空数组防抖
		// 写回，后续任何编辑会重新置 touched），并删除 storage 草稿。
		touchedRef.current = false;
		setPast((prev) => [...prev, strokes]);
		setFuture([]);
		setStrokes([]);
		clearDraft();
	};

	const handleColorSelect = (next: string) => {
		setColor(next);
		setErasing(false);
	};

	const strokeCount = strokes.length;

	return (
		<div ref={rootRef} data-game="drawing" data-stroke-count={strokeCount} style={rootStyle}>
			<canvas
				ref={canvasRef}
				style={canvasStyle}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={finishStroke}
				onPointerCancel={finishStroke}
				onPointerLeave={finishStroke}
			/>

			{/* 工具面板卡：默认收起为居中小扁胶囊（只剩开关钮），点击原地
			    丝滑展开；卡是悬浮层，画布尺寸永不变化 */}
			<div
				id="drawing-toolbar"
				style={toolbarStyle}
				role={toolsOpen ? "toolbar" : undefined}
				aria-label={toolsOpen ? "Drawing tools" : undefined}
			>
				<div
					style={{
						...toolsRowStyle,
						maxWidth: toolsOpen ? TOOLS_ROW_MAX_WIDTH : 0,
						opacity: toolsOpen ? 1 : 0,
						visibility: toolsOpen ? "visible" : "hidden",
					}}
				>
				{PALETTE.map((c) => {
					const selected = !erasing && color === c;
					return (
						<button
							key={c}
							type="button"
							data-tool="color"
							data-color={c}
							aria-label={`Brush color ${c}`}
							aria-pressed={selected}
							onClick={() => handleColorSelect(c)}
							style={{
								...toolButtonStyle,
								background: c,
								boxShadow: selected
									// 选中环用 inset 内描边：外扩环会被 morph 行的
									// overflow:hidden 裁切（上下各缺 2px），内画永远安全
									? "inset 0 0 0 2px rgba(29, 53, 87, 0.9)"
									: "inset 0 0 0 1px rgba(0, 0, 0, 0.25)",
							}}
						/>
					);
				})}

				<span style={dividerStyle} aria-hidden="true" />

				{BRUSH_WIDTHS.map((w) => {
					const selected = width === w;
					return (
						<button
							key={w}
							type="button"
							data-tool="width"
							data-width={w}
							aria-label={`Brush width ${w}`}
							aria-pressed={selected}
							onClick={() => setWidth(w)}
							style={{
								...toolButtonStyle,
								borderColor: selected ? "#1d3557" : "transparent",
							}}
						>
							<span
								style={{
									display: "block",
									width: Math.round(4 + w * 70),
									height: Math.round(4 + w * 70),
									borderRadius: "50%",
									background: "#264653",
								}}
							/>
						</button>
					);
				})}

				<span style={dividerStyle} aria-hidden="true" />

				<button
					type="button"
					data-tool="eraser"
					aria-label="Eraser"
					aria-pressed={erasing}
					onClick={() => setErasing((prev) => !prev)}
					style={{
						...toolButtonStyle,
						borderColor: erasing ? "#1d3557" : "transparent",
					}}
				>
					<Eraser size={16} />
				</button>

				<span style={dividerStyle} aria-hidden="true" />

				<button
					type="button"
					data-action="undo"
					aria-label="Undo"
					disabled={past.length === 0}
					onClick={handleUndo}
					style={{
						...toolButtonStyle,
						opacity: past.length === 0 ? 0.35 : 1,
						cursor: past.length === 0 ? "default" : "pointer",
					}}
				>
					<Undo size={16} />
				</button>
				<button
					type="button"
					data-action="redo"
					aria-label="Redo"
					disabled={future.length === 0}
					onClick={handleRedo}
					style={{
						...toolButtonStyle,
						opacity: future.length === 0 ? 0.35 : 1,
						cursor: future.length === 0 ? "default" : "pointer",
					}}
				>
					<Redo size={16} />
				</button>
				<button
					type="button"
					data-action="clear"
					aria-label="Clear canvas"
					disabled={strokeCount === 0}
					onClick={handleClear}
					style={{
						...toolButtonStyle,
						opacity: strokeCount === 0 ? 0.35 : 1,
						cursor: strokeCount === 0 ? "default" : "pointer",
					}}
				>
					<Trash2 size={16} />
				</button>

				<span style={dividerStyle} aria-hidden="true" />

				<button
					type="button"
					data-action="submit"
					aria-label="Submit drawing (coming in P1)"
					title="提交将在 P1 开放：登录后可上传到公共画布"
					disabled
					style={{
						...toolButtonStyle,
						width: "auto",
						padding: "0 10px",
						fontSize: 12,
						opacity: 0.45,
						cursor: "default",
					}}
				>
					Submit
				</button>

					<span style={dividerStyle} aria-hidden="true" />
				</div>

				{/* 开关钮：收起时卡里只剩它（小扁胶囊居中），展开后停靠行尾 */}
				<button
					type="button"
					data-toolbar-toggle
					aria-expanded={toolsOpen}
					aria-controls="drawing-toolbar"
					aria-label={toolsOpen ? "Hide drawing tools" : "Show drawing tools"}
					title={toolsOpen ? "Hide drawing tools" : "Show drawing tools"}
					onClick={() => setToolsOpen((prev) => !prev)}
					style={toggleButtonStyle}
				>
					{/* 箭头顺运动方向：展开时钮从中心滑向右端（›），
					    收起时滑回中心（‹） */}
					{toolsOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
				</button>
			</div>

			{/* 草稿恢复 toast：无按钮、不拦截绘制（pointerEvents: none），
			    出现 4s 后自动消失 */}
			{draftToastVisible && (
				<div
					data-draft-toast="restored"
					role="status"
					aria-live="polite"
					style={draftToastStyle}
				>
					Restored your last doodle — saved on this device
				</div>
			)}
		</div>
	);
}
