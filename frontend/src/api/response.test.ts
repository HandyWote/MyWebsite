import { describe, expect, it } from 'vitest';
import { ApiError, parseApiPayload } from './response';

const OK = { ok: true, status: 200, statusText: 'OK' };

function captureError(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe('parseApiPayload', () => {
  it('unwraps the {code:0,data} envelope on success', () => {
    expect(parseApiPayload<{ id: number }>({ code: 0, data: { id: 7 } }, OK)).toEqual({ id: 7 });
  });

  it('returns bare payloads that carry no envelope', () => {
    expect(parseApiPayload({ items: [1, 2] }, OK)).toEqual({ items: [1, 2] });
  });

  it('unwraps a code:0 envelope whose data is null', () => {
    expect(parseApiPayload<null>({ code: 0, data: null }, OK)).toBeNull();
  });

  // #16 红灯基线：`login -u` 空用户名时后端回 HTTP 200 + {code:400,message},
  // 旧实现只看 HTTP 状态码，把这个响应当成了登录成功。
  it('throws ApiError when HTTP is ok but the business code is non-zero', () => {
    const payload = { code: 400, message: 'Invalid request body' };
    const error = captureError(() => parseApiPayload(payload, OK));

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 200,
      message: 'Invalid request body',
      body: payload,
    });
  });

  it('throws ApiError for non-ok responses and prefers msg over message', () => {
    const payload = { msg: 'Not found', message: 'ignored' };
    const error = captureError(() =>
      parseApiPayload(payload, { ok: false, status: 404, statusText: 'Not Found' }),
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, message: 'Not found', body: payload });
  });

  it('falls back to the default message when the body carries none', () => {
    const error = captureError(() =>
      parseApiPayload({}, { ok: false, status: 500, statusText: 'Internal Server Error' }),
    );

    expect(error).toMatchObject({ status: 500, message: 'Request failed' });
  });

  it('honours a caller-provided fallback message', () => {
    const error = captureError(() =>
      parseApiPayload({}, { ok: false, status: 500, fallbackMessage: 'Backend request failed' }),
    );

    expect(error).toMatchObject({ status: 500, message: 'Backend request failed' });
  });

  it('exposes the raw payload on error.body so contract fields stay reachable', () => {
    const payload = { error: 'version conflict', current_version: 7 };
    const error = captureError(() =>
      parseApiPayload(payload, { ok: false, status: 409 }),
    );

    expect((error as ApiError).body).toEqual(payload);
  });
});
