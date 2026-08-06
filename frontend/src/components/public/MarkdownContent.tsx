import { Box } from "@mui/material";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { MermaidDiagram } from "./MermaidDiagram";
import { ARTICLE_CONTENT_SX } from "./articleContentTheme";

export function MarkdownContent({ content }: { content: string }) {
	return (
		<Box data-testid="article-markdown-content" sx={ARTICLE_CONTENT_SX}>
			<ReactMarkdown
				remarkPlugins={[remarkMath, remarkGfm]}
				rehypePlugins={[rehypeKatex]}
				components={{
					pre({ children }) {
						return <>{children}</>;
					},
					code({ className, children, ...props }) {
						const source = String(children);
						const language = /language-([\w-]+)/.exec(className ?? "")?.[1];
						if (language === "mermaid")
							return <MermaidDiagram source={source.replace(/\n$/, "")} />;
						if (language) {
							return (
								<SyntaxHighlighter
									language={language}
									style={oneDark}
									PreTag="pre"
									customStyle={{ margin: 0 }}
								>
									{source.replace(/\n$/, "")}
								</SyntaxHighlighter>
							);
						}
						if (source.endsWith("\n"))
							return (
								<pre>
									<code className={className} {...props}>
										{source}
									</code>
								</pre>
							);
						return (
							<code className={className} {...props}>
								{children}
							</code>
						);
					},
				}}
			>
				{content}
			</ReactMarkdown>
		</Box>
	);
}
