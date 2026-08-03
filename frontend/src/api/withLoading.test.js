import { describe, expect, it, vi } from 'vitest';
import { withLoading } from './withLoading';

describe('withLoading', () => {
  it('失败时设置 loading false 并 rethrow', async () => {
    const set = vi.fn();
    await expect(withLoading(set, 'loading', null, async () => {
      throw new Error('boom');
    })).rejects.toThrow('boom');
    expect(set).toHaveBeenCalledWith({ loading: true });
    expect(set).toHaveBeenLastCalledWith({ loading: false });
  });

  it('设置 error 字段并支持 rethrow=false 吞错', async () => {
    const set = vi.fn();
    const result = await withLoading(set, 'loading', 'error', async () => {
      throw new Error('soft');
    }, { rethrow: false });
    expect(result).toBeUndefined();
    expect(set).toHaveBeenLastCalledWith({ loading: false, error: 'soft' });
  });
});
