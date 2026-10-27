"use client";

import { Box } from "@mui/material";
import {
	useEffect,
	useId,
	useRef,
	useState,
	type KeyboardEvent,
	type ReactNode,
	type RefObject,
} from "react";
import { shouldAutoFocus, focusWithoutStealing } from "@/utils/focus";
import { typography } from "../tokens";

/**
 * PixelPromptInput - 终端提示符输入基元（`user@host $ █` 那一行）
 *
 * 结构分三层，视觉与交互解耦：
 * 1. 左侧 prompt 文本（<label>，点击即聚焦输入框）；
 * 2. 中间“镜像层”：把当前值渲染成可见文本 + 块状光标，纯展示
 *    （aria-hidden），secret 模式渲染 `*` 遮罩；
 * 3. 覆盖在镜像层上的真实 <input>：文字与 caret 全透明，只负责接收
 *    键盘/输入法/焦点。
 *
 * 取代此前各调用点手写的同一套结构（TerminalCommandBar 内联版）：
 * - id 由 React `useId()` 生成，不再拿 cwd 拼 id（`~` / `/` 会让 id 重挂后
 *   不稳定，且每个 cwd 各一份）
 * - 光标只在聚焦时闪（`.cursor-blink`），失焦定格——用户能看出到底有没有
 *   聚焦，而旧实现无条件闪、看不出
 * - 自动聚焦走 `@/utils/focus`：只在桌面精细指针且当前没有焦点时聚焦，
 *   绝不抢用户已经聚焦的控件
 *
 * 样式全部走 `sx`（MUI v9 已废弃 system props），视觉沿用终端尺寸：
 * mono 字体、0.8125rem、0.55em/1.2em 光标。
 */

export type PixelPromptInputMode = "text" | "secret";

/**
 * 挂载后的自动聚焦策略：
 * - `never`（默认）：调用方自己管焦点；
 * - `fine-pointer`：仅当设备是桌面精细指针（`shouldAutoFocus()`）且文档里
 *   当前没有别的元素聚焦时，聚焦本输入框。
 */
export type PixelPromptAutoFocusPolicy = "never" | "fine-pointer";

export interface PixelPromptInputProps {
	/** 提示符文本（如 `ada@~ $`）。作为 <label> 文本，点击即聚焦。 */
	prompt: ReactNode;
	/** 当前值（受控）。secret 模式下仍是明文，遮罩只在展示层做。 */
	value: string;
	/** 值变化回调；参数是新的字符串值（不是 event）。 */
	onChange: (value: string) => void;
	/** Enter 提交（输入法组合中的 Enter 不算）。 */
	onSubmit?: () => void;
	/**
	 * 键盘拦截，先于内部的 Enter 处理调用：调用方 `preventDefault()`
	 * 即可接管 Enter（如终端自己的补全/密码提交逻辑）。
	 */
	onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
	mode?: PixelPromptInputMode;
	disabled?: boolean;
	/** 处理中：等价于 disabled（终端执行命令时禁用输入）。 */
	busy?: boolean;
	/** 外部持有的 input 节点引用（需要手动 focus/select 时传入）。 */
	inputRef?: RefObject<HTMLInputElement | null>;
	/** 无障碍名称；secret 模式默认 `Password`，text 模式默认 `Prompt input`。 */
	ariaLabel?: string;
	autoFocusPolicy?: PixelPromptAutoFocusPolicy;
	/** 覆盖内部 `useId()` 生成的 id（需要外部 <label htmlFor> 时用）。 */
	id?: string;
}

export function PixelPromptInput({
	prompt,
	value,
	onChange,
	onSubmit,
	onKeyDown,
	mode = "text",
	disabled = false,
	busy = false,
	inputRef,
	ariaLabel,
	autoFocusPolicy = "never",
	id,
}: PixelPromptInputProps) {
	const generatedId = useId();
	const innerRef = useRef<HTMLInputElement | null>(null);
	// 由调用方提供 ref 时直接用它当“内部 ref”，避免 merge 两套 ref。
	const resolvedRef = inputRef ?? innerRef;
	const [focused, setFocused] = useState(false);

	const inputId = id ?? `pixel-prompt-${generatedId}`;
	const masked = mode === "secret";
	const inactive = disabled || busy;
	const displayValue = masked ? "*".repeat(value.length) : value;
	const resolvedLabel =
		ariaLabel ?? (masked ? "Password" : "Prompt input");

	useEffect(() => {
		if (autoFocusPolicy !== "fine-pointer") return;
		if (!shouldAutoFocus()) return;
		focusWithoutStealing(resolvedRef.current);
	}, [autoFocusPolicy, resolvedRef]);

	return (
		<Box
			sx={{
				display: "flex",
				alignItems: "center",
				gap: 1,
				minWidth: 0,
				opacity: inactive ? 0.6 : 1,
			}}
		>
			<Box
				component="label"
				htmlFor={inputId}
				sx={{
					color: "primary.main",
					fontFamily: typography.fontFamily.mono,
					fontSize: "0.8125rem",
					whiteSpace: "nowrap",
					cursor: inactive ? "default" : "text",
				}}
			>
				{prompt}
			</Box>
			<Box
				sx={{
					position: "relative",
					flex: 1,
					minWidth: 0,
					display: "flex",
					alignItems: "center",
					fontFamily: typography.fontFamily.mono,
					fontSize: "0.8125rem",
				}}
			>
				{/* 镜像层（纯展示）：可见文本 + 光标；焦点在真实 input 上 */}
				<Box
					component="span"
					aria-hidden="true"
					sx={{ color: "text.primary", whiteSpace: "pre" }}
				>
					{displayValue}
					<Box
						component="span"
						className={focused ? "cursor-blink" : undefined}
						sx={{
							display: "inline-block",
							width: "0.55em",
							height: "1.2em",
							bgcolor: "primary.main",
							ml: "0.15em",
							flexShrink: 0,
						}}
					/>
				</Box>
				{/* 真实 input（交互层）：透明文字 + 透明 caret，覆盖镜像捕获输入 */}
				<Box
					component="input"
					id={inputId}
					ref={resolvedRef}
					value={value}
					onChange={(event) => onChange(event.target.value)}
					onKeyDown={(event) => {
						onKeyDown?.(event);
						if (event.defaultPrevented) return;
						if (event.key !== "Enter") return;
						// 输入法组合中的 Enter 是“确认候选词”，不是提交。
						if (event.nativeEvent.isComposing) return;
						event.preventDefault();
						onSubmit?.();
					}}
					onFocus={() => setFocused(true)}
					onBlur={() => setFocused(false)}
					// busy 用 readOnly 而不是 disabled：disabled 会让浏览器把焦点
					// 移给 body，正在提交的密码框随即失焦（工单 #16 的"输错一次
					// 就得重新点一下"）。readOnly 保留焦点，只是不接受输入。
					disabled={disabled}
					readOnly={busy}
					aria-label={resolvedLabel}
					autoComplete="off"
					spellCheck={false}
					sx={{
						position: "absolute",
						inset: 0,
						width: "100%",
						border: 0,
						outline: "none",
						bgcolor: "transparent",
						color: "transparent",
						caretColor: "transparent",
						fontFamily: typography.fontFamily.mono,
						fontSize: "0.8125rem",
						cursor: inactive ? "default" : "text",
					}}
				/>
			</Box>
		</Box>
	);
}

export default PixelPromptInput;
