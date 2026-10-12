import { beforeEach, describe, expect, it, vi } from "vitest";
import { drawingApi } from "./drawingApi";
import { ApiError } from "./browser";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const STROKES = [
  {
    id: "s1",
    color: "#264653",
    width: 0.02,
    points: [
      { x: 0.1, y: 0.1, t: 1 },
      { x: 0.2, y: 0.2, t: 2 },
    ],
  },
];

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  window.localStorage.clear();
});

describe("drawingApi", () => {
  it("getCanvas fetches the public canvas endpoint and unwraps the envelope", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(200, {
        code: 0,
        data: { version: 3, strokes: STROKES, updated_at: "2026-01-01T00:00:00Z" },
      }),
    );

    await expect(drawingApi.getCanvas()).resolves.toEqual({
      version: 3,
      strokes: STROKES,
      updated_at: "2026-01-01T00:00:00Z",
    });
    expect(fetch).toHaveBeenCalledWith(
      "/api/games/drawing/canvas",
      expect.anything(),
    );
  });

  it("getCanvas retries once on a 5xx and succeeds", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(500, { message: "boom" }))
      .mockResolvedValueOnce(
        jsonResponse(200, { code: 0, data: { version: 0, strokes: [], updated_at: "" } }),
      );

    await expect(drawingApi.getCanvas()).resolves.toMatchObject({ version: 0 });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("getCanvas throws after a second 5xx", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(503, { message: "down" }));

    await expect(drawingApi.getCanvas()).rejects.toMatchObject({ status: 503 });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("getCanvas does not retry client errors like 404", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(404, { message: "nope" }));

    await expect(drawingApi.getCanvas()).rejects.toBeInstanceOf(ApiError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("submitStrokes posts the increment with the bearer token from localStorage", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(200, { code: 0, data: { version: 4, status: "published" } }),
    );
    window.localStorage.setItem("token", "jwt-token");

    await expect(
      drawingApi.submitStrokes(3, STROKES),
    ).resolves.toEqual({ version: 4, status: "published" });
    expect(fetch).toHaveBeenCalledWith(
      "/api/games/drawing/canvas",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-token",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ base_version: 3, strokes: STROKES }),
      }),
    );
  });

  it("submitStrokes omits the Authorization header without a token (backend 401s)", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(401, { error: "请先登录后再提交" }));

    await expect(drawingApi.submitStrokes(0, STROKES)).rejects.toMatchObject({ status: 401 });
    const [, init] = vi.mocked(fetch).mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it("submitStrokes surfaces the 409 current_version on the thrown ApiError", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(409, { error: "version conflict", current_version: 7 }),
    );

    const error = await drawingApi.submitStrokes(3, STROKES).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(409);
    expect((error as { currentVersion?: number }).currentVersion).toBe(7);
  });

  it("submitStrokes propagates 429/422 rejections as ApiError", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(429, { error: "提交过于频繁,请稍后再试" }))
      .mockResolvedValueOnce(jsonResponse(422, { error: "rejected", reason: "ocr" }));

    await expect(drawingApi.submitStrokes(0, STROKES)).rejects.toMatchObject({ status: 429 });
    await expect(drawingApi.submitStrokes(0, STROKES)).rejects.toMatchObject({ status: 422 });
  });

  it("submitStrokes unwraps the 202 pending envelope", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(202, { code: 0, data: { status: "pending", submission_id: 12 } }),
    );

    await expect(drawingApi.submitStrokes(2, STROKES)).resolves.toEqual({
      status: "pending",
      submission_id: 12,
    });
  });
});
