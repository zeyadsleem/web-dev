import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = ({ cookies, platform, url }) => {
  if (!platform?.env.GITHUB_CLIENT_ID)
    error(503, 'لم يتم إعداد تسجيل الدخول باستخدام GitHub بعد.');
  const state = crypto.randomUUID();
  cookies.set('oauth_state', state, {
    path: '/',
    httpOnly: true,
    secure: url.protocol === 'https:',
    sameSite: 'lax',
    maxAge: 600,
  });
  const target = new URL('https://github.com/login/oauth/authorize');
  target.searchParams.set('client_id', platform.env.GITHUB_CLIENT_ID);
  target.searchParams.set('state', state);
  target.searchParams.set('redirect_uri', url.origin + '/auth/github/callback');
  redirect(302, target.href);
};
