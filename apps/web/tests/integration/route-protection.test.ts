import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the auth entrypoint so importing the guard doesn't pull in Payload/DB.
const authMock = vi.fn();
vi.mock('@/auth', () => ({ auth: () => authMock() }));

// redirect() throws in Next; emulate that so we can assert it fired.
const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
vi.mock('next/navigation', () => ({ redirect: (url: string) => redirectMock(url) }));

const { requireSession } = await import('@/auth/require-session');

describe('protected app route (requireSession)', () => {
  beforeEach(() => {
    authMock.mockReset();
    redirectMock.mockClear();
  });

  it('redirects an unauthenticated request to sign-in (FR-001)', async () => {
    authMock.mockResolvedValue(null);
    await expect(requireSession()).rejects.toThrow('REDIRECT:/signin');
    expect(redirectMock).toHaveBeenCalledWith('/signin');
  });

  it('returns the session (no redirect) when an employee session is present', async () => {
    const session = { user: { id: '1', email: 'ada.employee@digdir.no' } };
    authMock.mockResolvedValue(session);
    await expect(requireSession()).resolves.toEqual(session);
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
