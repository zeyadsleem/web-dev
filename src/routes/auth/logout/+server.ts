import { redirect, error } from '@sveltejs/kit';
import { db, digest } from '$lib/server/db';
import type { RequestHandler } from './$types';
export const POST: RequestHandler = async ({
  request,
  url,
  cookies,
  platform,
}) => {
  if (request.headers.get('origin') !== url.origin)
    error(403, 'مصدر الطلب غير صالح');
  const token = cookies.get('session');
  if (token)
    await db(platform)
      .prepare('DELETE FROM sessions WHERE token_hash=?')
      .bind(await digest(token))
      .run();
  cookies.delete('session', { path: '/' });
  redirect(303, '/');
};
