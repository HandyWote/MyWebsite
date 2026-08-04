import { beforeEach, describe, expect, it } from 'vitest';
import { getAndClearRedirectPath, saveRedirectPath } from './auth';

describe('admin redirect path', () => {
  beforeEach(() => sessionStorage.clear());

  it('restores an admin-local path once', () => {
    saveRedirectPath('/admin/articles');
    expect(getAndClearRedirectPath()).toBe('/admin/articles');
    expect(getAndClearRedirectPath()).toBe('/admin');
  });

  it('rejects storage values outside the admin namespace', () => {
    saveRedirectPath('https://example.com/phishing');
    expect(getAndClearRedirectPath()).toBe('/admin');

    saveRedirectPath('//example.com/phishing');
    expect(getAndClearRedirectPath()).toBe('/admin');
  });
});
