import { timingSafeEqual } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { after, NextResponse } from "next/server";
import { articleCacheTag, CACHE_TAGS } from "@/api/cache";

export const runtime = "nodejs";

type RevalidationEvent = {
	entity: "article" | "site-block" | "avatar";
	action: "create" | "update" | "delete" | "batch" | "import";
	ids: number[];
};

type RevalidationPlan = {
	tags: string[];
	paths: string[];
	prewarmPaths: string[];
};

const ALLOWED_ACTIONS: Record<
	RevalidationEvent["entity"],
	ReadonlySet<string>
> = {
	article: new Set(["create", "update", "delete", "batch", "import"]),
	"site-block": new Set(["update", "delete"]),
	avatar: new Set(["update", "delete"]),
};
const EVENT_KEYS = new Set(["entity", "action", "ids"]);

function hasValidToken(request: Request, expectedToken: string): boolean {
	const authorization = request.headers.get("authorization") ?? "";
	if (!authorization.startsWith("Bearer ")) return false;
	const suppliedToken = authorization.slice("Bearer ".length).trim();
	if (!suppliedToken) return false;
	const expected = Buffer.from(expectedToken);
	const supplied = Buffer.from(suppliedToken);
	return (
		expected.length === supplied.length && timingSafeEqual(expected, supplied)
	);
}

function parseEvent(value: unknown): RevalidationEvent | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	const input = value as Record<string, unknown>;
	if (Object.keys(input).some((key) => !EVENT_KEYS.has(key))) return null;
	if (typeof input.entity !== "string" || typeof input.action !== "string")
		return null;
	if (!(input.entity in ALLOWED_ACTIONS)) return null;
	const entity = input.entity as RevalidationEvent["entity"];
	if (!ALLOWED_ACTIONS[entity].has(input.action)) return null;
	if (!Array.isArray(input.ids) || input.ids.length === 0) return null;
	if (!input.ids.every((id) => Number.isSafeInteger(id) && Number(id) > 0))
		return null;
	return {
		entity,
		action: input.action as RevalidationEvent["action"],
		ids: [...new Set(input.ids as number[])],
	};
}

export function planRevalidation(event: RevalidationEvent): RevalidationPlan {
	if (event.entity === "site-block") {
		return {
			tags: [CACHE_TAGS.siteBlocks],
			paths: ["/", "/articles", "/projects"],
			prewarmPaths: [],
		};
	}
	if (event.entity === "avatar") {
		return {
			tags: [CACHE_TAGS.profile],
			paths: ["/"],
			prewarmPaths: [],
		};
	}

	const detailPaths = event.ids.map((id) => `/articles/${id}`);
	const detailTags =
		event.action === "create" ? [] : event.ids.map(articleCacheTag);
	return {
		tags: [CACHE_TAGS.articleList, CACHE_TAGS.sitemap, ...detailTags],
		paths: ["/", "/articles", "/sitemap.xml", ...detailPaths],
		prewarmPaths: event.action === "create" ? detailPaths : [],
	};
}

export async function POST(request: Request) {
	const expectedToken = process.env.REVALIDATION_TOKEN?.trim() ?? "";
	if (!expectedToken) {
		return NextResponse.json(
			{ ok: false, error: "Revalidation is not configured" },
			{ status: 503 },
		);
	}
	if (!hasValidToken(request, expectedToken)) {
		return NextResponse.json(
			{ ok: false, error: "Unauthorized" },
			{ status: 401 },
		);
	}

	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		return NextResponse.json(
			{ ok: false, error: "Invalid JSON body" },
			{ status: 400 },
		);
	}
	const event = parseEvent(payload);
	if (!event) {
		return NextResponse.json(
			{ ok: false, error: "Invalid revalidation event" },
			{ status: 400 },
		);
	}

	const plan = planRevalidation(event);
	try {
		for (const tag of plan.tags) revalidateTag(tag, "max");
		for (const path of plan.paths) revalidatePath(path);
	} catch {
		return NextResponse.json(
			{ ok: false, event, error: "Revalidation failed" },
			{ status: 500 },
		);
	}

	if (plan.prewarmPaths.length > 0) {
		try {
			const origin = new URL(request.url).origin;
			after(async () => {
				const results = await Promise.allSettled(
					plan.prewarmPaths.map(async (path) => {
						const response = await fetch(new URL(path, origin));
						if (!response.ok) {
							throw new Error(`Prewarm returned ${response.status}`);
						}
						return response.text();
					}),
				);
				const failures = results.filter(
					(result) => result.status === "rejected",
				);
				if (failures.length > 0) {
					console.error(
						`Article prewarm failed for ${failures.length} path(s)`,
					);
				}
			});
		} catch {
			// Cache invalidation succeeded; optional prewarming must not make delivery retry.
		}
	}

	return NextResponse.json({
		ok: true,
		event,
		revalidated: { tags: plan.tags, paths: plan.paths },
		prewarm: { paths: plan.prewarmPaths },
	});
}
