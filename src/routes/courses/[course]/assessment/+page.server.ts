import { error, fail } from '@sveltejs/kit';
import { db, requireUser, digest } from '$lib/server/db';
import { publicQuestion } from '$lib/server/curriculum';
import { scoreAnswer, percentage } from '$lib/scoring';
import { validateCode } from '$lib/server/code-validation';
import type { Question } from '$lib/model';
async function exam(database: D1Database, course: string) {
  const rows = await database
    .prepare(
      "SELECT q.payload FROM questions q JOIN lessons l ON l.id=q.lesson_id WHERE l.course_id=? AND l.status='published' AND q.status='validated' ORDER BY l.position,q.id",
    )
    .bind(course)
    .all<{ payload: string }>();
  const all = rows.results.map((r) => JSON.parse(r.payload) as Question),
    count = Math.min(12, all.length);
  return Array.from(
    { length: count },
    (_, i) => all[Math.floor((i * all.length) / count)],
  );
}
export const load = async ({ params, platform, locals }) => {
  const database = db(platform);
  const course = await database
    .prepare('SELECT id,title FROM courses WHERE id=?')
    .bind(params.course)
    .first<{ id: string; title: string }>();
  if (!course) error(404, 'الكورس غير موجود');
  const questions = await exam(database, course.id);
  const history = await database
    .prepare(
      'SELECT score,created_at FROM course_assessment_attempts WHERE user_id=? AND course_id=? ORDER BY created_at DESC LIMIT 5',
    )
    .bind(locals.user?.id || '', course.id)
    .all<{ score: number; created_at: string }>();
  return {
    course,
    questions: questions.map(publicQuestion),
    revision: await digest(questions.map((q) => q.id + q.sourceHash).join('|')),
    history: history.results,
  };
};
export const actions = {
  default: async ({ params, platform, locals, request }) => {
    const user = requireUser(locals),
      database = db(platform),
      questions = await exam(database, params.course),
      form = await request.formData();
    if (!questions.length)
      return fail(400, {
        message: 'لا توجد أسئلة معتمدة حاليًا.',
      });
    if (
      form.get('revision') !==
      (await digest(questions.map((q) => q.id + q.sourceHash).join('|')))
    )
      return fail(409, {
        message: 'تغيّر المنهج. أعد تحميل الاختبار قبل التسليم.',
      });
    const results = questions.map((q) => {
      const answer = form.getAll(q.id).map(String);
      const correct =
        answer.join('').length <= 20000 &&
        (q.validator
          ? validateCode(q, answer[0] || '')
          : scoreAnswer(q, answer));
      return { q, answer, correct };
    });
    const score = percentage(
      results.filter((r) => r.correct).length,
      questions.length,
    );
    const statements = results.flatMap(({ q, answer, correct }) => [
      database
        .prepare(
          'INSERT INTO question_attempts(id,user_id,question_id,answer,correct,source_hash) VALUES(?,?,?,?,?,?)',
        )
        .bind(
          crypto.randomUUID(),
          user.id,
          q.id,
          JSON.stringify(answer),
          correct ? 1 : 0,
          q.sourceHash,
        ),
      correct
        ? database
            .prepare(
              'UPDATE review_queue SET resolved_at=CURRENT_TIMESTAMP WHERE user_id=? AND question_id=?',
            )
            .bind(user.id, q.id)
        : database
            .prepare(
              'INSERT INTO review_queue(user_id,question_id) VALUES(?,?) ON CONFLICT(user_id,question_id) DO UPDATE SET failures=failures+1,last_failed_at=CURRENT_TIMESTAMP,resolved_at=NULL',
            )
            .bind(user.id, q.id),
    ]);
    statements.push(
      database
        .prepare(
          'INSERT INTO course_assessment_attempts(id,user_id,course_id,score,question_count) VALUES(?,?,?,?,?)',
        )
        .bind(
          crypto.randomUUID(),
          user.id,
          params.course,
          score,
          questions.length,
        ),
    );
    await database.batch(statements);
    return {
      message: `تم حفظ الاختبار: ${score}%. ${score >= 80 ? 'اجتزت اختبار الإتقان.' : 'راجع الموضوعات التي أخطأت فيها ثم حاول مرة أخرى.'}`,
      results: results.map((r) => ({
        id: r.q.id,
        correct: r.correct,
        explanation: r.q.explanation,
      })),
    };
  },
};
