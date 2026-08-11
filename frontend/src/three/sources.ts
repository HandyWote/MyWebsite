import type { ResourceSource } from "./types";

export const COMPUTER_MODEL_NAME = "computerSetupModel" as const;
export const DECOR_MODEL_NAME = "decorModel" as const;

export const sources: readonly ResourceSource[] = [
	{
		name: COMPUTER_MODEL_NAME,
		type: "model",
		path: "/3d/v1/models/computer-setup.glb",
	},
	{
		name: "computerSetupTexture",
		type: "texture",
		path: "/3d/v1/textures/computer.webp",
	},
	{
		name: "environmentModel",
		type: "model",
		path: "/3d/v1/models/environment.glb",
	},
	{
		name: "environmentTexture",
		type: "texture",
		path: "/3d/v1/textures/environment.webp",
	},
	{ name: "decorModel", type: "model", path: "/3d/v1/models/decor.glb" },
	{ name: "decorTexture", type: "texture", path: "/3d/v1/textures/decor.webp" },
	{
		name: "monitorSmudgeTexture",
		type: "texture",
		path: "/3d/v1/textures/monitor-smudges.webp",
	},
	{
		name: "monitorShadowTexture",
		type: "texture",
		path: "/3d/v1/textures/monitor-shadow.webp",
	},
];
