"use client";

import { ThemeProvider } from "@mui/material/styles";
import type { ReactNode } from "react";
import { appTheme } from "@/theme/theme";

export function PixelProvider({ children }: { children: ReactNode }) {
	return <ThemeProvider theme={appTheme}>{children}</ThemeProvider>;
}

export default PixelProvider;
