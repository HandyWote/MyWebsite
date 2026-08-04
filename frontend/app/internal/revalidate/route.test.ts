import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fixtures from '../../../../contracts/revalidation-events.json';

const cacheMocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('next/cache', () => cacheMocks);

import { POST } from './route';

type ContractFixture = {
  event: { entity: string; action: string; ids: number[] };
  tags: string[];
  paths: string[];
  prewarmPaths: string[];
};

function request(body: unknown, token = 'contract-token'): Request {
  return new Request('http://next-web:3000/internal/revalidate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

describe('POST /internal/revalidate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.REVALIDATION_TOKEN = 'contract-token';
  });

  afterEach(() => {
    delete process.env.REVALIDATION_TOKEN;
  });

  it.each(fixtures as ContractFixture[])('maps $event.entity/$event.action from the Go contract', async (fixture) => {
    const response = await POST(request(fixture.event));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(cacheMocks.revalidateTag.mock.calls).toEqual(fixture.tags.map((tag) => [tag, 'max']));
    expect(cacheMocks.revalidatePath.mock.calls).toEqual(fixture.paths.map((path) => [path]));
    expect(payload).toEqual({
      ok: true,
      event: fixture.event,
      revalidated: { tags: fixture.tags, paths: fixture.paths },
      prewarm: { paths: fixture.prewarmPaths },
    });
  });

  it('fails closed for an empty, missing, or incorrect token', async () => {
    delete process.env.REVALIDATION_TOKEN;
    await expect(POST(request(fixtures[0].event))).resolves.toMatchObject({ status: 503 });

    process.env.REVALIDATION_TOKEN = 'contract-token';
    const missing = new Request('http://next-web:3000/internal/revalidate', {
      method: 'POST',
      body: JSON.stringify(fixtures[0].event),
    });
    await expect(POST(missing)).resolves.toMatchObject({ status: 401 });
    await expect(POST(request(fixtures[0].event, 'wrong-token'))).resolves.toMatchObject({ status: 401 });
    expect(cacheMocks.revalidateTag).not.toHaveBeenCalled();
  });

  it.each([
    { entity: 'tag', action: 'update', ids: [1] },
    { entity: 'article', action: 'publish', ids: [1] },
    { entity: 'article', action: 'update', ids: [] },
    { entity: 'article', action: 'update', ids: [0] },
    { entity: 'article', action: 'update', ids: [1], tags: ['arbitrary'] },
    { entity: 'article', action: 'update', ids: [1], path: '/admin' },
  ])('rejects uncontrolled event input %#', async (body) => {
    const response = await POST(request(body));

    expect(response.status).toBe(400);
    expect(cacheMocks.revalidateTag).not.toHaveBeenCalled();
    expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
  });

  it('returns a retryable failure without exposing an exception', async () => {
    cacheMocks.revalidateTag.mockImplementationOnce(() => {
      throw new Error('sensitive cache failure');
    });

    const response = await POST(request(fixtures[1].event));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      ok: false,
      event: fixtures[1].event,
      error: 'Revalidation failed',
    });
  });
});
