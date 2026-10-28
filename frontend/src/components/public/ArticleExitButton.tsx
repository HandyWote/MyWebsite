"use client";

import Link from "next/link";
import { Button } from "@mui/material";
import { ArrowLeft } from "lucide-react";

export function ArticleExitButton() {
	return (
		<Button
			component={Link}
			href="/articles"
			variant="text"
			startIcon={<ArrowLeft size={16} />}
		>
			exit buffer
		</Button>
	);
}
