import { hash } from './parser';
import type { Lesson, Question } from '../src/lib/model';
/** Deterministic, source-grounded cloze practice, deliberately distinct from inferred technical claims. */
export function enrich(lesson: Lesson): Question[] {
  const ar = lesson.language === 'ar';
  const questions: Question[] = [];
  for (const section of lesson.sections) {
    if (questions.length >= 3) break;
    if (lesson.questions.some((q) => q.sectionId === section.id)) continue;
    for (const b of section.blocks) {
      if (
        b.type !== 'paragraph' ||
        b.text.length < 60 ||
        b.text.length > 500 ||
        !b.html
      )
        continue;
      const candidate = b.html.match(
        /<(?:code|strong|b)[^>]*>([\p{L}][\p{L}\p{N} ._-]{2,35})<\//u,
      )?.[1];
      if (!candidate || b.text.split(candidate).length !== 2) continue;
      const prompt =
        (ar
          ? 'أكمل العبارة التالية من الدرس باستخدام المصطلح نفسه:\n'
          : 'Complete this statement from the lesson (use the exact term):\n') +
        b.text.replace(candidate, '_____');
      questions.push({
        id: lesson.id + ':cloze:' + hash(prompt).slice(0, 12),
        lessonId: lesson.id,
        sectionId: section.id,
        type: 'fill-blank',
        prompt,
        options: [],
        answer: [candidate],
        explanation: b.text,
        hints: [
          ar
            ? 'ابحث عن المصطلح في هذا الجزء من الدرس.'
            : 'Look for the term in this section.',
        ],
        difficulty: 1,
        origin: 'generated',
        status: 'validated',
        sourceHash: lesson.hash,
      });
      break;
    }
  }
  if (
    questions.length === 0 &&
    lesson.questions.length === 0 &&
    lesson.status === 'published' &&
    !lesson.id.endsWith('/quiz')
  ) {
    const section = lesson.sections.find((s) =>
      s.blocks.some(
        (b) =>
          b.type === 'paragraph' && b.text.length >= 80 && b.text.length < 600,
      ),
    );
    const paragraph = section?.blocks.find(
      (b) =>
        b.type === 'paragraph' && b.text.length >= 80 && b.text.length < 600,
    );
    const words = paragraph?.text.match(/[\p{L}][\p{L}-]{4,}/gu) || [];
    const term = words.find((w) => paragraph!.text.split(w).length === 2);
    if (section && paragraph && term) {
      const prompt =
        (ar
          ? 'اكتب الكلمة الناقصة من العبارة التالية:\n'
          : 'Recall the missing word from this source statement:\n') +
        paragraph.text.replace(term, '_____');
      questions.push({
        id: lesson.id + ':recall:' + hash(prompt).slice(0, 12),
        lessonId: lesson.id,
        sectionId: section.id,
        type: 'fill-blank',
        prompt,
        options: [],
        answer: [term],
        explanation: paragraph.text,
        hints: [
          ar
            ? 'راجع العبارة في نص الدرس.'
            : 'Read the statement in the source section.',
        ],
        difficulty: 1,
        origin: 'generated',
        status: 'validated',
        sourceHash: lesson.hash,
      });
    }
  }
  if (lesson.id === 'html/overview') {
    const section = lesson.sections.find((s) =>
      s.blocks.some((b) => b.text.includes('<h1>')),
    );
    if (section)
      questions.push({
        id: lesson.id + ':practice:heading',
        lessonId: lesson.id,
        sectionId: section.id,
        type: 'write-code',
        prompt: ar
          ? 'اكتب عنوانًا بعنصر h1 يحتوي على النص “Hello, web.” بالضبط. يجب أن يوجد عنصر h1 واحد.'
          : 'Write an h1 heading containing exactly “Hello, web.”. The DOM must contain one h1 element.',
        options: [],
        answer: [],
        explanation: ar
          ? 'يحوّل المتصفح <h1>Hello, web.</h1> إلى عنصر عنوان يحتوي على عقدة نصية.'
          : 'The browser parses <h1>Hello, web.</h1> into a heading element containing a text node.',
        hints: [
          ar
            ? 'استخدم وسم فتح ووسم إغلاق للعنوان.'
            : 'Use an opening and a closing heading tag.',
        ],
        difficulty: 1,
        origin: 'manual',
        status: 'validated',
        sourceHash: lesson.hash,
        validator: {
          kind: 'dom',
          selector: 'h1',
          count: 1,
          text: 'Hello, web.',
        },
        starter: '<h1></h1>',
      });
  }
  return questions;
}
