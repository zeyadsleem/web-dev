import { redirect, error } from '@sveltejs/kit';
import { db, digest } from '$lib/server/db';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async ({
  url,
  cookies,
  platform,
  fetch,
}) => {
  const state = cookies.get('oauth_state');
  cookies.delete('oauth_state', { path: '/' });
  if (
    !state ||
    state !== url.searchParams.get('state') ||
    !url.searchParams.get('code')
  )
    error(400, 'طلب الدخول غير صالح أو انتهت صلاحيته. حاول مرة أخرى.');
  const secret = platform?.env.GITHUB_CLIENT_SECRET;
  if (!secret) error(503, 'لم يتم إعداد مفتاح تسجيل الدخول.');
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: platform!.env.GITHUB_CLIENT_ID,
      client_secret: secret,
      code: url.searchParams.get('code'),
      redirect_uri: url.origin + '/auth/github/callback',
    }),
  });
  const token: { access_token?: string } = await response.json();
  if (!response.ok || !token.access_token)
    error(401, 'تعذر تسجيل الدخول باستخدام GitHub. حاول مرة أخرى.');
  const profile = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      'User-Agent': 'LearnLab',
      Accept: 'application/vnd.github+json',
    },
  });
  if (!profile.ok) error(401, 'تعذر تحميل حساب GitHub.');
  const user: { id: number; login: string; name: string | null } =
    await profile.json();
  if (!Number.isSafeInteger(user.id) || !user.login)
    error(401, 'حساب GitHub غير صالح.');
  const session = crypto.randomUUID() + crypto.randomUUID(),
    database = db(platform);
  await database.batch([
    database
      .prepare(
        'INSERT INTO users(id,name) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name',
      )
      .bind(String(user.id), user.name || user.login),
    database
      .prepare('INSERT INTO sessions VALUES (?,?,?)')
      .bind(await digest(session), String(user.id), Date.now() + 30 * 86400000),
  ]);
  cookies.set('session', session, {
    path: '/',
    httpOnly: true,
    secure: url.protocol === 'https:',
    sameSite: 'lax',
    maxAge: 30 * 86400,
  });
  redirect(303, '/');
};
