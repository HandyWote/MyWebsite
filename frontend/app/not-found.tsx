import type { Metadata } from "next";
import { PublicShell } from "@/components/public/PublicShell";
import { TerminalNotFound } from "@/components/public/TerminalNotFound";

export const metadata: Metadata = {
	title: "404 not found",
	robots: { index: false, follow: false },
};

/** activePath=/404 不匹配任何真实路由：explorer 无高亮、cwd 默认 ~/app。 */
export default function NotFoundPage() {
	return (
		<PublicShell activePath="/404">
			<TerminalNotFound />
		</PublicShell>
	);
}
