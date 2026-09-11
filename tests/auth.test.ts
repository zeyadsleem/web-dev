import { it, expect, vi } from 'vitest';
import { GET as start } from '../src/routes/auth/github/+server';
import { GET as callback } from '../src/routes/auth/github/callback/+server';
it('GitHub login creates an HttpOnly state cookie and redirects only to GitHub', () => {
  const set = vi.fn();
  const event = {
    platform: { env: { GITHUB_CLIENT_ID: 'test-client' } },
    url: new URL('https://learn.example/auth/github'),
    cookies: { set },
  } as unknown as Parameters<typeof start>[0];
  try {
    start(event);
    throw Error('Expected redirect');
  } catch (result) {
    expect(result).toMatchObject({ status: 302 });
    expect((result as { location: string }).location).toMatch(
      /^https:\/\/github.com\/login\/oauth\/authorize\?/,
    );
  }
  expect(set).toHaveBeenCalledWith(
    'oauth_state',
    expect.any(String),
    expect.objectContaining({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 600,
    }),
  );
});
it('rejects missing or mismatched OAuth state before exchanging the code', async () => {
  const fetch = vi.fn();
  const event = {
    url: new URL(
      'https://learn.example/auth/github/callback?code=x&state=wrong',
    ),
    cookies: { get: () => 'expected', delete: vi.fn() },
    fetch,
  } as unknown as Parameters<typeof callback>[0];
  await expect(callback(event)).rejects.toMatchObject({ status: 400 });
  expect(fetch).not.toHaveBeenCalled();
});
it('exchanges a valid code, stores a hashed session, and uses secure cookies', async () => {
  const bind = vi.fn().mockReturnValue({}),
    batch = vi.fn().mockResolvedValue([]),
    set = vi.fn();
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({ access_token: 'temporary-test-token' }),
    )
    .mockResolvedValueOnce(
      Response.json({ id: 123, login: 'learner', name: 'Learner' }),
    );
  const event = {
    url: new URL(
      'https://learn.example/auth/github/callback?code=code&state=state',
    ),
    cookies: { get: () => 'state', delete: vi.fn(), set },
    platform: {
      env: {
        GITHUB_CLIENT_ID: 'client',
        GITHUB_CLIENT_SECRET: 'test-secret',
        DB: { prepare: () => ({ bind }), batch },
      },
    },
    fetch,
  } as unknown as Parameters<typeof callback>[0];
  await expect(callback(event)).rejects.toMatchObject({
    status: 303,
    location: '/',
  });
  expect(batch).toHaveBeenCalledOnce();
  expect(set).toHaveBeenCalledWith(
    'session',
    expect.any(String),
    expect.objectContaining({ httpOnly: true, secure: true, sameSite: 'lax' }),
  );
  const cookie = set.mock.calls[0][1];
  expect(bind.mock.calls.some((args) => args[0] === cookie)).toBe(false);
  expect(bind.mock.calls.some((args) => /^[a-f0-9]{64}$/.test(args[0]))).toBe(
    true,
  );
});
