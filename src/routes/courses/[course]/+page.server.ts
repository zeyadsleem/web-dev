import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { courses } from '$lib/server/curriculum';
export const load = async ({ params, platform, locals }) => {
  const database = db(platform);
  const course = (await courses(database, locals.user?.id || '')).find(
    (c) => c.id === params.course,
  );
  if (!course) error(404, 'الكورس غير موجود');
  const { results } = await database
    .prepare(
      'SELECT l.id,l.title,l.description,l.status AS source_status,l.position,p.status,p.score,p.section_id FROM lessons l LEFT JOIN lesson_progress p ON p.lesson_id=l.id AND p.user_id=? WHERE l.course_id=? ORDER BY l.position',
    )
    .bind(locals.user?.id || '', params.course)
    .all<{
      id: string;
      title: string;
      description: string;
      source_status: string;
      position: number;
      status: string | null;
      score: number | null;
      section_id: string | null;
    }>();
  return { course, lessons: results };
};
