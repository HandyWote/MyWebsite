"use client";

import { Children, type CSSProperties, type ReactNode } from "react";
import { motion } from "framer-motion";

/**
 * RevealList - 逐条错峰入场动画容器（迁移自旧版 framer-motion 列表动画）
 *
 * 旧版行为参考:
 * - 文章列表 ArticleList.jsx: initial {opacity:0, x:-20} → {1, 0}, delay = index * 0.08
 * - 项目列表 ProjectList.jsx: initial {opacity:0, y:20} → {1, 0}, delay = min(index * 0.025, 0.35)
 *
 * 用法（server 组件中直接包裹 children，client 边界由本组件承担）:
 *   <RevealList gap={1.5} direction="left" stagger={0.08}>
 *     {items.map(...)}
 *   </RevealList>
 */
export function RevealList({
	children,
	gap = 1.5,
	direction = "left",
	stagger = 0.08,
	maxDelay,
	style,
}: {
	children: ReactNode;
	/** MUI spacing 刻度（1 = 8px），对应旧版 gap 数值 */
	gap?: number;
	/** 入场方向: left = 左滑入（文章），up = 上滑入（项目） */
	direction?: "left" | "up";
	/** 每条目递增的延迟（秒） */
	stagger?: number;
	/** 延迟上限（秒），默认不设上限 */
	maxDelay?: number;
	style?: CSSProperties;
}) {
	const items = Children.toArray(children);
	const from =
		direction === "left" ? { opacity: 0, x: -20 } : { opacity: 0, y: 20 };
	return (
		<motion.div
			initial={false}
			style={{
				display: "flex",
				flexDirection: "column",
				gap: gap * 8,
				...style,
			}}
		>
			{items.map((child, index) => (
				<motion.div
					key={index}
					initial={from}
					animate={{ opacity: 1, x: 0, y: 0 }}
					transition={{
						delay: Math.min(
							index * stagger,
							maxDelay ?? Number.POSITIVE_INFINITY,
						),
					}}
				>
					{child}
				</motion.div>
			))}
		</motion.div>
	);
}
