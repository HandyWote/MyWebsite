"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
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
 * - 笔刷/橡皮/撤销/重做/清空 + localStorage 草稿；提交为禁用占位（P1）。
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

const toolbarStyle: CSSProperties = {
	position: "absolute",
	top: 8,
	left: "50%",
	transform: "translateX(-50%)",
	zIndex: 1,
	display: "flex",
	alignItems: "center",
	flexWrap: "wrap",
	justifyContent: "center",
	gap: 4,
	maxWidth: "96%",
	padding: 6,
	borderRadius: 12,
	background: "rgba(255, 255, 255, 0.72)",
	boxShadow: "0 1px 6px rgba(0, 0, 0, 0.18)",
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
	background: "rgba(255, 255, 255, 0.9)",
	fontSize: 14,
	lineHeight: 1,
	color: "#264653",
	cursor: "pointer",
};

const dividerStyle: CSSProperties = {
	width: 1,
	height: 18,
	margin: "0 2px",
	background: "rgba(0, 0, 0, 0.18)",
};

const promptButtonStyle: CSSProperties = {
	padding: "7px 14px",
	borderRadius: 8,
	border: "1px solid #264653",
	background: "#264653",
	color: "#fff",
	fontSize: 13,
	fontWeight: 600,
	cursor: "pointer",
};

export function DrawingGame({ host }: GameViewProps) {
	const rootRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	/** 进行中笔画的同步镜像：pointerup 后同帧可能再触发 pointerleave，
	 *  用 ref 保证只提交一次（React 状态在事件间已刷新，但同帧二次事件
	 *  仍会读到旧闭包）。 */
	const currentRef = useRef<Stroke | null>(null);
	/** 用户是否对画布做过任何修改（画/撤销/重做/清空）：只在这些时候
	 *  写草稿，避免覆盖既有草稿或为从未动笔的访问者落盘空数据。 */
	const touchedRef = useRef(false);

	const [size, setSize] = useState(() =>
		typeof window === "undefined" ? ZERO_SIZE : host.getSize(),
	);
	const [strokes, setStrokes] = useState<Stroke[]>([]);
	const [current, setCurrent] = useState<Stroke | null>(null);
	/** 历史快照栈：past = 可撤销的历史，future = 可重做的未来。 */
	const [past, setPast] = useState<Stroke[][]>([]);
	const [future, setFuture] = useState<Stroke[][]>([]);
	const [color, setColor] = useState<string>(PALETTE[0]);
	const [width, setWidth] = useState<number>(DEFAULT_WIDTH);
	const [erasing, setErasing] = useState(false);
	/** 草稿：挂载时读取一次（只挂到桌面纸面上，纯客户端，无 SSR），
	 *  非空则出提示层。用惰性初始化而非 effect，避免级联渲染。 */
	const [draftPrompt, setDraftPrompt] = useState<Drawing | null>(() => {
		const draft = loadDraft();
		return draft !== null && draft.strokes.length > 0 ? draft : null;
	});

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
		touchedRef.current = true;
		setPast((prev) => [...prev, strokes]);
		setFuture([]);
		setStrokes([]);
	};

	const handleColorSelect = (next: string) => {
		setColor(next);
		setErasing(false);
	};

	const handleContinueDraft = () => {
		if (!draftPrompt) return;
		setStrokes(draftPrompt.strokes);
		setDraftPrompt(null);
	};

	const handleDiscardDraft = () => {
		setDraftPrompt(null);
		clearDraft();
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

			{/* 工具栏：小尺寸、半透明，不遮整张纸 */}
			<div style={toolbarStyle} role="toolbar" aria-label="Drawing tools">
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
									? "0 0 0 2px rgba(29, 53, 87, 0.9)"
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
					⌫
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
					↶
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
					↷
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
					✕
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
			</div>

			{/* 草稿提示层：继续上次 / 新画 */}
			{draftPrompt && (
				<div
					style={{
						position: "absolute",
						inset: 0,
						zIndex: 2,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						background: "rgba(244, 236, 216, 0.88)",
					}}
				>
					<div style={{ textAlign: "center", padding: 16, maxWidth: "80%" }}>
						<p
							style={{
								margin: "0 0 12px",
								fontSize: 14,
								fontWeight: 600,
								color: "#264653",
							}}
						>
							Found a previous doodle
						</p>
						<div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
							<button
								type="button"
								data-draft-action="continue"
								aria-label="Continue previous doodle"
								onClick={handleContinueDraft}
								style={promptButtonStyle}
							>
								Continue
							</button>
							<button
								type="button"
								data-draft-action="discard"
								aria-label="Discard previous doodle and start new"
								onClick={handleDiscardDraft}
								style={{
									...promptButtonStyle,
									background: "transparent",
									color: "#264653",
								}}
							>
								New drawing
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
