"use client";

import { Box } from "@mui/material";
import { useRouter } from "next/navigation";
import { useState, type KeyboardEvent } from "react";
import { uniqueCommands, type ShellArticle } from "./shellUtils";

const HELP_LINES = [
	"Available commands:",
	"  cd articles/      open article list",
	"  cd projects/      open project list",
	"  cd about/         return welcome page",
	"  open latest       open latest article",
	"  open <article>    open article by id/title",
	"  open prev         open previous article",
	"  open next         open next article",
	"  exit              leave current article buffer",
	"  clear             clear terminal output",
	"  help              show this help",
];

const normalizeCommand = (value: string) => value.trim().replace(/\s+/g, " ");

const toCommandSlug = (value: string) =>
	value.trim().toLowerCase().replace(/\s+/g, "-");

export function TerminalCommandBar({
	cwd,
	commands,
	articles = [],
	currentArticleId,
}: {
	cwd: string;
	commands: string[];
	articles?: ShellArticle[];
	currentArticleId?: number;
}) {
	const router = useRouter();
	const [command, setCommand] = useState("");
	const [outputLines, setOutputLines] = useState<string[]>([]);
	const [activeIndex, setActiveIndex] = useState(0);

	const availableCommands = uniqueCommands([
		...commands,
		...articles.map((article) => `open ${article.title}`),
	]);
	const normalizedInput = command.trim().toLowerCase();
	const visibleCandidates = normalizedInput
		? availableCommands
				.filter((item) => item.toLowerCase().includes(normalizedInput))
				.slice(0, 8)
		: [];

	const executeCommand = (rawCommand: string) => {
		const nextCommand = normalizeCommand(rawCommand);
		if (!nextCommand) return;

		setCommand("");
		setActiveIndex(0);

		if (nextCommand === "cd articles/" || nextCommand === "cd articles") {
			router.push("/articles");
			return;
		}

		if (nextCommand === "cd projects/" || nextCommand === "cd projects") {
			router.push("/projects");
			return;
		}

		if (
			nextCommand === "cd about/" ||
			nextCommand === "cd about" ||
			nextCommand === "home" ||
			nextCommand === "about"
		) {
			router.push("/");
			return;
		}

		if (nextCommand === "exit" || nextCommand === "back") {
			router.push("/articles");
			return;
		}

		if (nextCommand === "open latest") {
			const latest = articles[0];
			router.push(latest ? `/articles/${latest.id}` : "/articles");
			return;
		}

		if (nextCommand === "open prev" || nextCommand === "open next") {
			const index = articles.findIndex(
				(article) => article.id === currentArticleId,
			);
			if (index !== -1) {
				const neighbor =
					articles[nextCommand === "open prev" ? index - 1 : index + 1];
				if (neighbor) {
					router.push(`/articles/${neighbor.id}`);
					return;
				}
			}
			setOutputLines([
				nextCommand === "open prev" ? "no previous article" : "no next article",
			]);
			return;
		}

		if (
			nextCommand.startsWith("open ") &&
			nextCommand !== "open latest" &&
			nextCommand !== "open prev" &&
			nextCommand !== "open next"
		) {
			const target = nextCommand.replace(/^open\s+/, "").trim();
			if (/^\d+$/.test(target)) {
				router.push(`/articles/${target}`);
				return;
			}
			const matchedArticle = articles.find(
				(article) =>
					article.title === target ||
					toCommandSlug(article.title) === toCommandSlug(target),
			);
			if (matchedArticle) {
				router.push(`/articles/${matchedArticle.id}`);
				return;
			}
		}

		if (nextCommand === "clear") {
			setOutputLines([]);
			return;
		}

		if (nextCommand === "help") {
			setOutputLines(HELP_LINES);
			return;
		}

		setOutputLines([`command not found: ${nextCommand}`]);
	};

	const completeCommand = () => {
		if (visibleCandidates.length === 0) return;
		setCommand(visibleCandidates[activeIndex] || visibleCandidates[0]);
	};

	const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Tab") {
			event.preventDefault();
			completeCommand();
			return;
		}

		if (event.key === "ArrowDown" && visibleCandidates.length > 0) {
			event.preventDefault();
			setActiveIndex((index) => (index + 1) % visibleCandidates.length);
			return;
		}

		if (event.key === "ArrowUp" && visibleCandidates.length > 0) {
			event.preventDefault();
			setActiveIndex(
				(index) =>
					(index - 1 + visibleCandidates.length) % visibleCandidates.length,
			);
			return;
		}

		if (event.key === "Enter") {
			executeCommand(visibleCandidates[activeIndex] || command);
		}
	};

	return (
		<Box
			sx={{
				borderTop: 1,
				borderColor: "divider",
				bgcolor: "background.paper",
				px: 1.5,
				py: 1,
				flexShrink: 0,
			}}
		>
			{outputLines.length > 0 && (
				<Box
					sx={{
						mb: 0.75,
						maxHeight: { xs: "24dvh", sm: "32vh" },
						overflow: "auto",
						fontFamily: "JetBrains Mono, monospace",
						color: "text.secondary",
						fontSize: "0.75rem",
						lineHeight: 1.45,
						whiteSpace: "pre-wrap",
					}}
				>
					{outputLines.map((line) => (
						<Box component="div" key={line}>
							{line}
						</Box>
					))}
				</Box>
			)}

			{visibleCandidates.length > 0 && (
				<Box
					role="listbox"
					aria-label="Command suggestions"
					sx={{
						mb: 0.75,
						maxHeight: { xs: "28dvh", sm: "36vh" },
						overflow: "auto",
						fontFamily: "JetBrains Mono, monospace",
						fontSize: "0.75rem",
						lineHeight: 1.45,
						color: "text.secondary",
					}}
				>
					{visibleCandidates.map((candidate, index) => (
						<Box
							component="div"
							role="option"
							aria-selected={index === activeIndex}
							key={candidate}
							onMouseDown={(event) => {
								event.preventDefault();
								executeCommand(candidate);
							}}
							sx={{
								display: "grid",
								gridTemplateColumns: "16px minmax(0, 1fr)",
								cursor: "default",
								color:
									index === activeIndex ? "text.primary" : "text.secondary",
								bgcolor:
									index === activeIndex
										? "rgba(88, 166, 255, 0.12)"
										: "transparent",
								px: 0.25,
							}}
						>
							<Box
								component="span"
								sx={{
									color:
										index === activeIndex ? "primary.main" : "text.disabled",
								}}
							>
								{index === activeIndex ? "▸" : ""}
							</Box>
							<Box component="span">{candidate}</Box>
						</Box>
					))}
				</Box>
			)}

			<Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
				<Box
					component="label"
					htmlFor={`command-${cwd}`}
					sx={{
						color: "primary.main",
						fontFamily: "JetBrains Mono, monospace",
						fontSize: "0.8125rem",
						whiteSpace: "nowrap",
					}}
				>
					Guess@{cwd} $
				</Box>
				<Box
					sx={{
						position: "relative",
						flex: 1,
						minWidth: 0,
						display: "flex",
						alignItems: "center",
						fontFamily: "JetBrains Mono, monospace",
						fontSize: "0.8125rem",
					}}
				>
					{/* 镜像文本 + 光标（视觉层）：光标紧跟输入内容末尾 */}
					<Box
						component="span"
						aria-hidden="true"
						sx={{ color: "text.primary", whiteSpace: "pre" }}
					>
						{command}
						<Box
							component="span"
							className="cursor-blink"
							sx={{
								display: "inline-block",
								width: 8,
								height: 16,
								bgcolor: "primary.main",
								ml: 0.25,
								flexShrink: 0,
							}}
						/>
					</Box>
					{/* 真实 input（交互层）：透明文字 + 透明 caret，覆盖镜像捕获输入 */}
					<Box
						id={`command-${cwd}`}
						component="input"
						value={command}
						onChange={(event) => {
							setCommand(event.target.value);
							setActiveIndex(0);
						}}
						onKeyDown={onKeyDown}
						aria-label="Terminal command"
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
							fontFamily: "JetBrains Mono, monospace",
							fontSize: "0.8125rem",
						}}
					/>
				</Box>
			</Box>
		</Box>
	);
}
