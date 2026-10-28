import type {} from "@mui/material/themeCssVarsAugmentation";

/** MUI palette 类型增广:`text.muted` 是本项目自有键(见 themeOptions.ts)。 */
declare module "@mui/material/styles" {
	interface TypeText {
		muted: string;
	}
	interface Palette {
		text: Palette["text"] & { muted: string };
	}
	interface PaletteOptions {
		text: PaletteOptions["text"] & { muted?: string };
	}
}
