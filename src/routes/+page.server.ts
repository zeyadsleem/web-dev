import { db } from '$lib/server/db';
import { courses } from '$lib/server/curriculum';
export const load = async ({ platform, locals }) => {
  const database = db(platform),
    id = locals.user?.id || '';
  const [catalog, stats, recent, review, resume] = await Promise.all([
    courses(database, id),
    database
      .prepare(
        'SELECT COUNT(*) AS answered,COALESCE(SUM(correct),0) AS correct FROM question_attempts WHERE user_id=?',
      )
      .bind(id)
      .first<{ answered: number; correct: number }>(),
    database
      .prepare(
        'SELECT p.*,l.title FROM lesson_progress p JOIN lessons l ON l.id=p.lesson_id WHERE p.user_id=? ORDER BY last_activity DESC LIMIT 5',
      )
      .bind(id)
      .all<{
        lesson_id: string;
        title: string;
        status: string;
        last_activity: string;
      }>(),
    database
      .prepare(
        "SELECT COUNT(*) AS count FROM review_queue r JOIN questions q ON q.id=r.question_id WHERE r.user_id=? AND r.resolved_at IS NULL AND q.status='validated'",
      )
      .bind(id)
      .first<{ count: number }>(),
    database
      .prepare(
        "SELECT l.id,l.title,p.section_id FROM lesson_progress p JOIN lessons l ON l.id=p.lesson_id WHERE p.user_id=? AND p.status='in-progress' AND l.status='published' ORDER BY p.last_activity DESC LIMIT 1",
      )
      .bind(id)
      .first<{ id: string; title: string; section_id: string }>(),
  ]);
  const next =
    resume ||
    (await database
      .prepare(
        "SELECT l.id,l.title,'introduction' AS section_id FROM lessons l JOIN courses c ON c.id=l.course_id LEFT JOIN lesson_progress p ON p.lesson_id=l.id AND p.user_id=? WHERE l.status='published' AND (p.status IS NULL OR p.status<>'completed') ORDER BY c.path_order IS NULL,c.path_order,c.source_order,l.position LIMIT 1",
      )
      .bind(id)
      .first<{ id: string; title: string; section_id: string }>());
  return {
    courses: catalog,
    stats,
    review: review?.count || 0,
    recent: recent.results,
    next,
  };
};
