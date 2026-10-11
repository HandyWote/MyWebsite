import type { Metadata } from "next";
import { Box } from "@mui/material";
import { ScreenFrame } from "@/components/public/ScreenFrame";
import { TerminalCommandBar } from "@/components/public/TerminalCommandBar";
import { TerminalNotFound } from "@/components/public/TerminalNotFound";

export const metadata: Metadata = {
	title: "404 not found",
	robots: { index: false, follow: false },
};

/** 与首页/文章页同款 screen-page 骨架：内容区 + 底部终端条，无 explorer。 */
export default function NotFoundPage() {
	return (
		<ScreenFrame>
			<Box
				component="main"
				sx={{ minWidth: 0, minHeight: 0, overflow: "auto" }}
			>
				<Box sx={{ p: { xs: 1, sm: 2.5 }, pl: { xs: 1, sm: 3 } }}>
					<TerminalNotFound />
				</Box>
			</Box>
			<TerminalCommandBar
				cwd="~/app"
				commands={["cd articles/", "cd projects/", "cd games/", "help"]}
			/>
		</ScreenFrame>
	);
}
