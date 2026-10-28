"use client";

import type { ReactNode } from "react";
import { useShellFlip } from "./shellTransition";

/** 客户端外壳:挂全局链接转场拦截(内容本身仍是服务端渲染)。 */
export function ShellFlipProvider({ children }: { children: ReactNode }) {
	useShellFlip();
	return <>{children}</>;
}
