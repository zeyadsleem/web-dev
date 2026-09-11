import { error, fail } from '@sveltejs/kit';
import { db, requireUser } from '$lib/server/db';
import { lesson, progress, publicQuestion } from '$lib/server/curriculum';
import { validateCode } from '$lib/server/code-validation';
import { scoreAnswer } from '$lib/scoring';
export const load = async ({ params, platform, locals }) => {
  const database = db(platform),
    content = await lesson(database, params.id);
  if (!content) error(404, 'الدرس غير موجود');
  const [saved, siblings, attempts] = await Promise.all([
    locals.user ? progress(database, locals.user.id, params.id) : null,
    database
      .prepare(
        'SELECT id,title,position FROM lessons WHERE course_id=? AND status=? ORDER BY position',
      )
      .bind(content.course_id, 'published')
      .all<{ id: string; title: string; position: number }>(),
    database
      .prepare(
        'SELECT question_id,MAX(correct) AS correct FROM question_attempts WHERE user_id=? AND source_hash=? GROUP BY question_id',
      )
      .bind(locals.user?.id || '', content.hash)
      .all<{ question_id: string; correct: number }>(),
  ]);
  return {
    lesson: { ...content, questions: content.questions.map(publicQuestion) },
    progress: saved,
    siblings: siblings.results,
    passed: attempts.results.filter((a) => a.correct).map((a) => a.question_id),
  };
};
export const actions = {
  answer: async ({ params, request, locals, platform }) => {
    const user = requireUser(locals),
      database = db(platform),
      form = await request.formData(),
      content = await lesson(database, params.id);
    if (!content || content.status !== 'published')
      return fail(400, { message: 'هذا الدرس غير متاح.' });
    const question = content.questions.find(
      (q) => q.id === form.get('questionId'),
    );
    if (!question)
      return fail(400, { message: 'تغيّر السؤال. أعد تحميل الدرس.' });
    const answer = form.getAll('answer').map(String);
    if (answer.join('').length > 20000)
      return fail(400, { message: 'الإجابة أطول من الحد المسموح.' });
    let correct: boolean;
    try {
      correct = question.validator
        ? validateCode(question, answer[0] || '')
        : scoreAnswer(question, answer);
    } catch {
      return fail(400, {
        message: 'استخدم ساحة الأكواد للتحقق من هذا التحدي.',
      });
    }
    await database.batch([
      database
        .prepare(
          'INSERT INTO question_attempts(id,user_id,question_id,answer,correct,source_hash) VALUES (?,?,?,?,?,?)',
        )
        .bind(
          crypto.randomUUID(),
          user.id,
          question.id,
          JSON.stringify(answer),
          correct ? 1 : 0,
          content.hash,
        ),
      database
        .prepare(
          'INSERT INTO lesson_progress(user_id,lesson_id,section_id) VALUES (?,?,?) ON CONFLICT(user_id,lesson_id) DO UPDATE SET last_activity=CURRENT_TIMESTAMP',
        )
        .bind(user.id, params.id, question.sectionId),
      correct
        ? database
            .prepare(
              'UPDATE review_queue SET resolved_at=CURRENT_TIMESTAMP WHERE user_id=? AND question_id=?',
            )
            .bind(user.id, question.id)
        : database
            .prepare(
              'INSERT INTO review_queue(user_id,question_id) VALUES (?,?) ON CONFLICT(user_id,question_id) DO UPDATE SET failures=failures+1,last_failed_at=CURRENT_TIMESTAMP,resolved_at=NULL',
            )
            .bind(user.id, question.id),
    ]);
    return {
      questionId: question.id,
      correct,
      explanation: question.explanation,
      message: correct
        ? 'إجابة صحيحة. تم حفظ إجابتك.'
        : 'الإجابة غير صحيحة. أُضيف السؤال إلى قائمة المراجعة.',
    };
  },
  bookmark: async ({ params, request, locals, platform }) => {
    const user = requireUser(locals),
      database = db(platform),
      form = await request.formData(),
      content = await lesson(database, params.id),
      section = String(form.get('section'));
    if (!content?.sections.some((s) => s.id === section))
      return fail(400, { message: 'القسم غير موجود' });
    await database
      .prepare(
        'INSERT INTO lesson_progress(user_id,lesson_id,section_id) VALUES (?,?,?) ON CONFLICT(user_id,lesson_id) DO UPDATE SET section_id=excluded.section_id,last_activity=CURRENT_TIMESTAMP',
      )
      .bind(user.id, params.id, section)
      .run();
    return { message: 'تم حفظ مكان القراءة.' };
  },
  complete: async ({ params, locals, platform }) => {
    const user = requireUser(locals),
      database = db(platform),
      content = await lesson(database, params.id);
    if (!content || content.status !== 'published')
      return fail(400, { message: 'لا يمكن إكمال هذا الدرس حاليًا.' });
    const graded = content.questions;
    const passed = await database
      .prepare(
        'SELECT DISTINCT question_id FROM question_attempts WHERE user_id=? AND source_hash=? AND correct=1',
      )
      .bind(user.id, content.hash)
      .all<{ question_id: string }>();
    const count = graded.filter((q) =>
      passed.results.some((p) => p.question_id === q.id),
    ).length;
    if (count < graded.length)
      return fail(400, {
        message: `أجب عن كل أسئلة الاختبار بشكل صحيح قبل إكمال الدرس (${count}/${graded.length}).`,
      });
    const score = graded.length ? 100 : null;
    await database.batch([
      database
        .prepare(
          "INSERT INTO lesson_progress(user_id,lesson_id,status,score,attempts,completed_at) VALUES (?,?,'completed',?,1,CURRENT_TIMESTAMP) ON CONFLICT(user_id,lesson_id) DO UPDATE SET status='completed',score=excluded.score,attempts=attempts+1,last_activity=CURRENT_TIMESTAMP,completed_at=COALESCE(completed_at,CURRENT_TIMESTAMP)",
        )
        .bind(user.id, params.id, score),
      database
        .prepare(
          'INSERT INTO quiz_attempts(id,user_id,lesson_id,score) VALUES (?,?,?,?)',
        )
        .bind(crypto.randomUUID(), user.id, params.id, score ?? 0),
    ]);
    return { message: 'اكتمل الدرس وتم حفظ التقدم.' };
  },
};
