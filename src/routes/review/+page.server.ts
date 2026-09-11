import { db, requireUser } from '$lib/server/db';
export const load = async ({ platform, locals }) => {
  const user = requireUser(locals);
  const result = await db(platform)
    .prepare(
      "SELECT q.id,q.lesson_id,q.section_id,q.payload,l.title,r.failures FROM review_queue r JOIN questions q ON q.id=r.question_id JOIN lessons l ON l.id=q.lesson_id WHERE r.user_id=? AND r.resolved_at IS NULL AND q.status='validated' AND l.status='published' ORDER BY r.failures DESC,r.last_failed_at DESC",
    )
    .bind(user.id)
    .all<{
      id: string;
      lesson_id: string;
      section_id: string;
      payload: string;
      title: string;
      failures: number;
    }>();
  return {
    items: result.results.map(({ payload, ...r }) => ({
      ...r,
      prompt: JSON.parse(payload).prompt as string,
    })),
  };
};
