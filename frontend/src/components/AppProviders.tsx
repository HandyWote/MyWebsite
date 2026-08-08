"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { CssBaseline, ThemeProvider } from "@mui/material";
import type { ReactNode } from "react";
import { appTheme } from "@/theme/theme";

export function AppProviders({ children }: { children: ReactNode }) {
	return (
		<AppRouterCacheProvider>
			<ThemeProvider theme={appTheme}>
				<CssBaseline />
				{children}
			</ThemeProvider>
		</AppRouterCacheProvider>
	);
}
