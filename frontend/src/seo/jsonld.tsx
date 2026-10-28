import type { ReactElement } from "react";
import {
	SITE_AUTHOR,
	SITE_DESCRIPTION,
	SITE_NAME,
	absoluteSiteUrl,
	serializeJsonLd,
} from "./site";

/**
 * 站点级 JSON-LD（WebSite + Person）与面包屑 JSON-LD。
 *
 * 数据源是 `getProfileForPage()` 返回的站点块（home.title / home.subtitle /
 * home.author / home.github_url），本文件只依赖其结构，不依赖 server-only 模块。
 *
 * TODO(issue #20): 首页 `app/(public)/page.tsx` 尚未挂载 `renderWebsiteJsonLd(profile)`，
 * 由拥有首页的改动接入（`<>{renderWebsiteJsonLd(await getProfileForPage())}...</>`）。
 */

export type SeoProfile = {
	home?: {
		title?: string;
		subtitle?: string;
		author?: string;
		github_url?: string;
	};
	avatarUrl?: string;
};

export type BreadcrumbItem = { name: string; path: string };

export function websiteJsonLd(profile: SeoProfile) {
	const home = profile.home ?? {};
	const siteUrl = absoluteSiteUrl("/");
	return {
		"@context": "https://schema.org",
		"@type": "WebSite",
		"@id": `${siteUrl}#website`,
		url: siteUrl,
		name: home.title?.trim() || SITE_NAME,
		description: home.subtitle?.trim() || SITE_DESCRIPTION,
		inLanguage: "zh-CN",
		publisher: { "@id": `${siteUrl}#person` },
	};
}

export function personJsonLd(profile: SeoProfile) {
	const home = profile.home ?? {};
	const siteUrl = absoluteSiteUrl("/");
	const avatar = profile.avatarUrl ? absoluteSiteUrl(profile.avatarUrl) : "";
	return {
		"@context": "https://schema.org",
		"@type": "Person",
		"@id": `${siteUrl}#person`,
		name: home.author?.trim() || SITE_AUTHOR,
		url: siteUrl,
		...(avatar ? { image: avatar } : {}),
		...(home.github_url ? { sameAs: [home.github_url] } : {}),
	};
}

export function breadcrumbJsonLd(items: readonly BreadcrumbItem[]) {
	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: items
			.map((item) => ({
				name: item.name,
				url: absoluteSiteUrl(item.path),
			}))
			.filter((item) => item.url)
			.map((item, index) => ({
				"@type": "ListItem",
				position: index + 1,
				name: item.name,
				item: item.url,
			})),
	};
}

export function renderWebsiteJsonLd(profile: SeoProfile): ReactElement {
	return (
		<>
			<JsonLdScript id="website" data={websiteJsonLd(profile)} />
			<JsonLdScript id="person" data={personJsonLd(profile)} />
		</>
	);
}

export function renderBreadcrumbJsonLd(
	items: readonly BreadcrumbItem[],
): ReactElement {
	return <JsonLdScript id="breadcrumb" data={breadcrumbJsonLd(items)} />;
}

function JsonLdScript({ id, data }: { id: string; data: unknown }) {
	return (
		<script
			type="application/ld+json"
			data-jsonld={id}
			dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
		/>
	);
}
