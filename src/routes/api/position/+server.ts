import { json, error } from '@sveltejs/kit';
import { db, requireUser } from '$lib/server/db';
import type { RequestHandler } from './$types';
export const POST: RequestHandler = async ({
  request,
  url,
  locals,
  platform,
}) => {
  if (request.headers.get('origin') !== url.origin)
    error(403, 'مصدر الطلب غير صالح');
  const user = requireUser(locals);
  const body = await request.text();
  if (body.length > 2000)
    error(413, 'بيانات مكان القراءة أكبر من الحد المسموح');
  let payload: { lessonId: string; sectionId: string; offset: number };
  try {
    payload = JSON.parse(body);
  } catch {
    error(400, 'مكان القراءة غير صالح');
  }
  if (
    typeof payload.lessonId !== 'string' ||
    typeof payload.sectionId !== 'string' ||
    !Number.isFinite(payload.offset)
  )
    error(400, 'مكان القراءة غير صالح');
  const database = db(platform);
  const section = await database
    .prepare('SELECT id FROM lesson_sections WHERE lesson_id=? AND id=?')
    .bind(payload.lessonId, payload.sectionId)
    .first();
  if (!section) error(404, 'القسم غير موجود');
  await database
    .prepare(
      'INSERT INTO lesson_progress(user_id,lesson_id,section_id,scroll_offset) VALUES (?,?,?,?) ON CONFLICT(user_id,lesson_id) DO UPDATE SET section_id=excluded.section_id,scroll_offset=excluded.scroll_offset,last_activity=CURRENT_TIMESTAMP',
    )
    .bind(
      user.id,
      payload.lessonId,
      payload.sectionId,
      Math.max(0, Math.min(100000, Math.round(payload.offset))),
    )
    .run();
  return json({ saved: true });
};
