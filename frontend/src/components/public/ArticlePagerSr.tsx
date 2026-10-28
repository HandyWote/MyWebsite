import { Fragment } from "react";
import { Box } from "@mui/material";

const MONO = "JetBrains Mono, monospace";

/**
 * 列表翻页导航：人眼不可见，爬虫与无障碍树可见。
 *
 * 隐藏态用 sr-only 手法（绝对定位 + 1px 盒 + clip-path），**不能用 display:none**，
 * 否则爬虫与 a11y 树都拿不到链接。键盘焦点（:focus-visible）时只改
 * clip-path / 宽高并把面板钉在列表容器内侧（容器需 position: relative），
 * 绝对定位使现形不参与文档流，宽度锁定为容器 100% 因而不产生横向滚动条。
 */
export function ArticlePagerSr({
	page,
	totalPages,
	maxLinks = 10,
}: {
	page: number;
	totalPages: number;
	maxLinks?: number;
}) {
	const lastPage = Math.max(1, totalPages);
	const listedPages = Math.min(lastPage, Math.max(1, maxLinks));
	const pages = Array.from({ length: listedPages }, (_, index) => index + 1);
	const hasPrev = page > 1;
	const hasNext = page < lastPage;
	const href = (target: number) => `/articles?page=${target}`;

	return (
		<Box component="nav" aria-label="Articles pagination" sx={srNavSx}>
			{hasPrev && <a href={href(page - 1)}>« prev</a>}
			{hasPrev && <Separator />}
			<Box component="span" sx={{ display: "inline" }}>
				{pages.map((target) => (
					<Fragment key={target}>
						{target > 1 && <Separator />}
						<a
							href={href(target)}
							aria-current={target === page ? "page" : undefined}
						>
							{target}
						</a>
					</Fragment>
				))}
			</Box>
			{hasNext && <Separator />}
			{hasNext && <a href={href(page + 1)}>next »</a>}
		</Box>
	);
}

function Separator() {
	return (
		<Box component="span" aria-hidden="true" sx={{ mx: "0.35em" }}>
			·
		</Box>
	);
}

const srNavSx = {
	position: "absolute",
	left: 0,
	top: 0,
	width: 1,
	height: 1,
	overflow: "hidden",
	clipPath: "inset(50%)",
	whiteSpace: "nowrap",
	fontFamily: MONO,
	fontSize: "0.75rem",
	color: "text.secondary",
	bgcolor: "background.default",
	"& a": {
		color: "inherit",
		textDecoration: "none",
		"&:hover, &:focus-visible": { textDecoration: "underline" },
	},
	"& a[aria-current='page']": { color: "primary.main" },
	"&:has(a:focus-visible)": {
		width: "100%",
		height: "auto",
		overflow: "visible",
		clipPath: "none",
		whiteSpace: "normal",
		p: 0.75,
		zIndex: 3,
	},
} as const;
