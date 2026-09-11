import type { Handle } from '@sveltejs/kit';
import { digest } from '$lib/server/db';
export const handle: Handle = async ({ event, resolve }) => {
  event.locals.user = null;
  const token = event.cookies.get('session');
  if (token && event.platform?.env.DB) {
    event.locals.user = await event.platform.env.DB.prepare(
      'SELECT u.id,u.name FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?',
    )
      .bind(await digest(token), Date.now())
      .first();
  }
  const response = await resolve(event);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  );
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
};
