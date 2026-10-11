import { Box } from "@mui/material";
import type { ReactNode } from "react";

/** 公共页外框唯一实现(screen-page grid + divider 边框 + overflow hidden);server-safe,无 hooks。 */
export function ScreenFrame({ children }: { children: ReactNode }) {
	return (
		<Box
			className="screen-page"
			sx={{
				height: "var(--public-viewport-height)",
				display: "grid",
				gridTemplateRows: "minmax(0, 1fr) auto",
				border: 1,
				borderColor: "divider",
				overflow: "hidden",
				bgcolor: "background.default",
			}}
		>
			{children}
		</Box>
	);
}
