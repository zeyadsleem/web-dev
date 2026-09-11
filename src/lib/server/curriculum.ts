import type { Course, Progress, Section, Question } from '$lib/model';
import { highlightCode } from './highlight';
export type CourseSummary = Course & { total: number; completed: number };
export async function courses(database: D1Database, userId: string) {
  const { results } = await database
    .prepare(
      `SELECT c.id,c.title,c.url,c.description,c.source_order AS sourceOrder,c.path_order AS pathOrder,c.status,COUNT(l.id) AS total,COALESCE(SUM(p.status='completed'),0) AS completed FROM courses c LEFT JOIN lessons l ON l.course_id=c.id AND l.status='published' LEFT JOIN lesson_progress p ON p.lesson_id=l.id AND p.user_id=? WHERE c.status='published' GROUP BY c.id ORDER BY c.path_order IS NULL,c.path_order,c.source_order`,
    )
    .bind(userId)
    .all<CourseSummary>();
  return results;
}
export type LessonRow = {
  id: string;
  course_id: string;
  title: string;
  url: string;
  position: number;
  description: string;
  status: string;
  hash: string;
  content_version: number;
  authors: string;
  imported_at: string;
};
export async function lesson(database: D1Database, id: string) {
  const row = await database
    .prepare('SELECT * FROM lessons WHERE id=?')
    .bind(id)
    .first<LessonRow>();
  if (!row) return null;
  const [sections, questions, pending] = await Promise.all([
    database
      .prepare(
        'SELECT id,title,blocks FROM lesson_sections WHERE lesson_id=? ORDER BY position',
      )
      .bind(id)
      .all<{ id: string; title: string; blocks: string }>(),
    database
      .prepare(
        "SELECT payload FROM questions WHERE lesson_id=? AND status='validated'",
      )
      .bind(id)
      .all<{ payload: string }>(),
    database
      .prepare(
        "SELECT COUNT(*) AS count FROM questions WHERE lesson_id=? AND status='needs-review'",
      )
      .bind(id)
      .first<{ count: number }>(),
  ]);
  const parsedSections = sections.results.map((s) => ({
    ...s,
    blocks: JSON.parse(s.blocks) as Section['blocks'],
  }));
  await Promise.all(
    parsedSections.flatMap((s) =>
      s.blocks
        .filter((b) => b.type === 'code' && !b.html)
        .map(async (b) => (b.html = await highlightCode(b.text, b.language))),
    ),
  );
  return {
    ...row,
    pendingQuestions: pending?.count || 0,
    sections: parsedSections.map((s) => ({
      ...s,
      blocks: s.blocks,
    })) as Section[],
    questions: questions.results.map((q) => JSON.parse(q.payload) as Question),
  };
}
export async function progress(
  database: D1Database,
  userId: string,
  id: string,
) {
  return database
    .prepare('SELECT * FROM lesson_progress WHERE user_id=? AND lesson_id=?')
    .bind(userId, id)
    .first<Progress>();
}
export const publicQuestion = (q: Question) => {
  const { answer, explanation, ...safe } = q;
  return safe;
};
