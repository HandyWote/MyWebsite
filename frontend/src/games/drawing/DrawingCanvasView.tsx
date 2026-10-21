"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { drawingApi, type CanvasState } from "@/api/drawingApi";
import type { GameViewProps } from "../types";
import { renderDrawing } from "./drawingCanvas";

/**
 * 画板查看模式（P1 F2，工单 #9 T8）：DetailWindow——非桌面 /games/drawing
 * 页的静态公共画布只读视图。宿主是 STUB_HOST（getSize 全 0，不阻塞），
 * 尺寸走容器 ResizeObserver + 4:3 固定比例，不依赖 host.getSize。
 * 渲染复用 renderDrawing（与桌面画板同一渲染器）；失败/空态/加载态
 * 文案英文小写，data-canvas-view/data-canvas-empty 供测试。
 */

const wrapperStyle: CSSProperties = {
	position: "relative",
	width: "100%",
	maxWidth: 640,
	aspectRatio: "4 / 3",
	margin: "0 auto",
	border: "1px solid rgba(38, 70, 83, 0.2)",
	borderRadius: 8,
	overflow: "hidden",
	background: "#f4ecd8",
};

const canvasStyle: CSSProperties = {
	position: "absolute",
	inset: 0,
	width: "100%",
	height: "100%",
};

const overlayStyle: CSSProperties = {
	position: "absolute",
	inset: 0,
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	padding: 16,
	textAlign: "center",
	fontFamily: "JetBrains Mono, monospace",
	fontSize: 13,
	fontWeight: 600,
	color: "#264653",
	background: "#f4ecd8",
};

/** 空画布（version=0 且无笔画）文案。 */
const EMPTY_TEXT = "the canvas is empty — be the first to draw";
/** 拉取失败文案。 */
const ERROR_TEXT = "canvas unavailable — try again later";
/** 加载中占位。 */
const LOADING_TEXT = "loading canvas…";

export function DrawingCanvasView(_props: GameViewProps) {
	const rootRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
	const [state, setState] = useState<CanvasState | null>(null);

	// —— 拉取公共画布 ——
	useEffect(() => {
		let cancelled = false;
		drawingApi
			.getCanvas()
			.then((data) => {
				if (cancelled) return;
				setState(data);
				setStatus("ready");
			})
			.catch(() => {
				if (cancelled) return;
				setStatus("error");
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const isEmpty = status === "ready" && state !== null && state.version === 0 && state.strokes.length === 0;

	// —— 渲染：容器实际尺寸（RO 兜底）× dpr，笔画按 0-1 相对坐标铺满 ——
	useEffect(() => {
		if (status !== "ready" || state === null || state.strokes.length === 0) return;
		const root = rootRef.current;
		const canvas = canvasRef.current;
		if (!root || !canvas) return;
		const draw = () => {
			const rect = root.getBoundingClientRect();
			const width = rect.width || root.clientWidth;
			const height = rect.height || root.clientHeight;
			if (width <= 0 || height <= 0) return;
			const dpr = window.devicePixelRatio || 1;
			const deviceWidth = Math.round(width * dpr);
			const deviceHeight = Math.round(height * dpr);
			if (canvas.width !== deviceWidth) canvas.width = deviceWidth;
			if (canvas.height !== deviceHeight) canvas.height = deviceHeight;
			const ctx = canvas.getContext("2d");
			if (!ctx) return;
			renderDrawing(ctx, { strokes: state.strokes }, { width, height }, dpr);
		};
		draw();
		if (typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver(() => draw());
		observer.observe(root);
		return () => observer.disconnect();
	}, [status, state]);

	return (
		<div ref={rootRef} data-canvas-view style={wrapperStyle}>
			{/* 静态笔画层：ready 且有笔画时渲染 */}
			{status === "ready" && state !== null && state.strokes.length > 0 && (
				<canvas ref={canvasRef} style={canvasStyle} aria-label="Public drawing canvas" />
			)}
			{status === "loading" && <div style={overlayStyle}>{LOADING_TEXT}</div>}
			{status === "error" && <div style={overlayStyle}>{ERROR_TEXT}</div>}
			{isEmpty && <div data-canvas-empty style={overlayStyle}>{EMPTY_TEXT}</div>}
		</div>
	);
}
