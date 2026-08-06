"use client";

import { Box, Typography } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import { browserApi } from "@/api/browser";
import { API_ENDPOINTS } from "@/api/endpoints";
import type { ArticlePage, ArticleSummary } from "@/api/types";
import { ArticleCards } from "./ArticleCards";

export function ArticleListMore({
	initialArticles,
	total,
	pageSize = 10,
}: {
	initialArticles: ArticleSummary[];
	total: number;
	pageSize?: number;
}) {
	const [articles, setArticles] = useState<ArticleSummary[]>(initialArticles);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const sentinelRef = useRef<HTMLDivElement | null>(null);
	const loadingRef = useRef(false);
	const pageRef = useRef(1);
	const hasMore = articles.length < total;

	useEffect(() => {
		setArticles(initialArticles);
		pageRef.current = 1;
	}, [initialArticles]);

	const loadMore = useCallback(async () => {
		if (loadingRef.current || !hasMore) return;
		loadingRef.current = true;
		setLoading(true);
		setError("");
		try {
			const nextPage = pageRef.current + 1;
			const payload = await browserApi.get<ArticlePage>(
				`${API_ENDPOINTS.PUBLIC.ARTICLES}?page=${nextPage}&per_page=${pageSize}`,
			);
			const next = payload.items ?? payload.articles ?? [];
			setArticles((current) => [...current, ...next]);
			pageRef.current = nextPage;
		} catch (reason) {
			setError(
				reason instanceof Error ? reason.message : "Unable to load articles",
			);
		} finally {
			loadingRef.current = false;
			setLoading(false);
		}
	}, [hasMore, pageSize]);

	useEffect(() => {
		const sentinel = sentinelRef.current;
		if (!sentinel || !hasMore || typeof IntersectionObserver === "undefined") {
			return;
		}
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					void loadMore();
				}
			},
			{ rootMargin: "200px 0px" },
		);
		observer.observe(sentinel);
		return () => observer.disconnect();
	}, [hasMore, loadMore]);

	return (
		<>
			<ArticleCards articles={articles} />
			{error && (
				<Typography color="error" sx={{ mt: 1.5 }}>
					{error}
				</Typography>
			)}
			{hasMore && (
				<Box ref={sentinelRef} aria-hidden="true" sx={{ height: 1 }} />
			)}
			{loading && (
				<Typography sx={{ mt: 1.5, color: "text.secondary" }}>
					Loading...
				</Typography>
			)}
		</>
	);
}
