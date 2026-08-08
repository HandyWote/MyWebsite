"use client";

import { Button } from "@mui/material";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function ArticleExitButton() {
	const router = useRouter();

	return (
		<Button
			type="button"
			variant="text"
			startIcon={<ArrowLeft size={16} />}
			onClick={() => router.push("/articles")}
		>
			exit buffer
		</Button>
	);
}
