import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fetchPage, locale } from './discover';
import { parseLesson } from './parser';
import { enrich } from './enrichment';
import type { Course, Lesson } from '../src/lib/model';
type Discovery = {
  discoveredAt: string;
  courses: {
    slug: string;
    title: string;
    url: string;
    description: string;
    sourceOrder: number;
    lessons: { id: string; url: string; position: number }[];
  }[];
};
export function validate(courses: Course[], lessons: Lesson[]) {
  const errors: string[] = [],
    ids = new Set<string>();
  for (const c of courses) {
    if (c.status !== 'published') continue;
    const ls = lessons.filter(
      (l) => l.courseId === c.id && l.status === 'published',
    );
    if (!ls.length) errors.push('Empty course ' + c.id);
    if (ls.some((l, i) => i > 0 && l.position <= ls[i - 1].position))
      errors.push('Invalid ordering ' + c.id);
  }
  for (const l of lessons) {
    if (ids.has(l.id)) errors.push('Duplicate ' + l.id);
    ids.add(l.id);
    if (new Set(l.sections.map((s) => s.id)).size !== l.sections.length)
      errors.push('Duplicate section ' + l.id);
    if (!l.url.startsWith('https://web.dev/learn/'))
      errors.push('Invalid URL ' + l.id);
    if (!l.sections.some((s) => s.blocks.length)) errors.push('Empty ' + l.id);
    for (const q of l.questions) {
      if (!l.sections.some((s) => s.id === q.sectionId))
        errors.push('Missing section ' + q.id);
      if (q.status === 'validated' && !q.answer.length && !q.validator)
        errors.push('Missing answer ' + q.id);
    }
  }
  return errors;
}
const action = process.argv[2] || 'sync';
if (process.argv[1]?.endsWith('curriculum.ts')) {
  const discovery: Discovery = JSON.parse(
    await readFile('data/discovery.json', 'utf8'),
  );
  const order: string[] = JSON.parse(
    await readFile('data/learning-order.json', 'utf8'),
  );
  if (action === 'validate') {
    const data = JSON.parse(await readFile('data/curriculum.json', 'utf8'));
    const errors = validate(data.courses, data.lessons);
    if (errors.length) throw Error(errors.join('\n'));
    console.log('Curriculum valid', data.courses.length, data.lessons.length);
    process.exit(0);
  }
  await mkdir('data/raw/lessons', { recursive: true });
  let old: Lesson[] = [],
    oldCourses: Course[] = [];
  try {
    const previous = JSON.parse(await readFile('data/curriculum.json', 'utf8'));
    old = previous.lessons;
    oldCourses = previous.courses;
  } catch {}
  const arabicCourseDescriptions: Record<string, string> = {
    html: 'دورة HTML لمطوّري الويب تمنحك نظرة شاملة على لغة HTML من المستوى المبتدئ إلى المتقدّم.',
    css: 'دورة CSS مرجعية دائمة لرفع مستوى خبرتك في تصميم الويب.',
    javascript: 'دورة متعمّقة في أساسيات JavaScript.',
    performance:
      'هذه الدورة موجّهة للمبتدئين في أداء الويب، وهو جانب حيوي من تجربة المستخدم.',
    privacy: 'دورة تساعدك في بناء مواقع ويب أكثر احترامًا لخصوصية المستخدمين.',
    accessibility:
      'دورة مرجعية دائمة في إمكانية الوصول لرفع مستوى تطويرك للويب.',
    images: 'دورة متعمّقة حول الصور على الويب.',
    design:
      'دورة تستكشف كل جوانب التصميم المتجاوب لتتعلم إنشاء مواقع تعمل بشكل رائع على كل الأجهزة.',
    forms: 'دورة عن نماذج HTML لمساعدتك على تطوير خبرتك كمطوّر ويب.',
    pwa: 'دورة تفصّل كل جوانب تطوير تطبيقات الويب التقدّمية (PWA) الحديثة.',
    testing: 'دورة متعمّقة في اختبار البرمجيات.',
    ai: 'دورة في الذكاء الاصطناعي مصمّمة لمطوّري الويب.',
  };
  const arabicLessonDescriptions: Record<string, string> = {
    'css/inheritance':
      'بعض خصائص CSS تُورَّث إذا لم تحدّد لها قيمة. تعرّف في هذه الوحدة على كيفية عمل ذلك وكيفية الاستفادة منه.',
    'ai/client-side':
      'تعرّف على خياراتك للذكاء الاصطناعي في المتصفح، وما المقايضات المتوقّعة، وكيفية التعامل مع القيود الخاصة بتطبيقك.',
  };
  const courses: Course[] = discovery.courses.map((c) => ({
    id: c.slug,
    title: c.title,
    url: c.url,
    description: arabicCourseDescriptions[c.slug] || c.description,
    sourceOrder: c.sourceOrder,
    pathOrder: order.includes(c.slug) ? order.indexOf(c.slug) : null,
    status: 'published',
  }));
  const lessons: Lesson[] = [];
  const report = {
    at: new Date().toISOString(),
    coursesDiscovered: courses.length,
    lessonsDiscovered: discovery.courses.reduce(
      (n, c) => n + c.lessons.length,
      0,
    ),
    unchanged: 0,
    updated: 0,
    new: 0,
    unavailable: 0,
    englishFallbacks: [] as string[],
    parsingFailures: [] as string[],
    validationFailures: [] as string[],
    changedPages: [] as string[],
  };
  const rawPath = (id: string, lang: string) =>
    `data/raw/${lang}/lessons/${id.replaceAll('/', '__')}.html`;
  for (const c of discovery.courses)
    for (const l of c.lessons) {
      try {
        const path = rawPath(l.id, locale);
        const html =
          action === 'parse'
            ? await readFile(path, 'utf8')
            : await fetchPage(l.url, path, process.argv.includes('--refresh'));
        if (action === 'crawl') {
          if (!RegExp('<html[^>]*lang="' + locale + '(?:-[^"]*)?"').test(html))
            await fetchPage(l.url, rawPath(l.id, 'en'), false, 'en');
          continue;
        }
        let lesson = parseLesson(html, { ...l, courseId: c.slug });
        if (lesson.language !== locale) {
          if (lesson.language !== 'en')
            throw Error('Unsupported source language: ' + l.url);
          const english =
            action === 'parse'
              ? await readFile(rawPath(l.id, 'en'), 'utf8')
              : await fetchPage(l.url, rawPath(l.id, 'en'), false, 'en');
          lesson = parseLesson(english, { ...l, courseId: c.slug });
          report.englishFallbacks.push(l.url);
        }
        const rawDescription = (lesson.description || '')
          .trim()
          .replaceAll('&gt;', '>');
        lesson.description =
          arabicLessonDescriptions[l.id] ||
          (rawDescription === '>-' || rawDescription === ''
            ? ''
            : lesson.description);
        lesson.questions.push(...enrich(lesson));
        const prev = old.find((x) => x.id === l.id);
        if (prev?.hash === lesson.hash) {
          lessons.push({
            ...prev,
            language: lesson.language,
            description: lesson.description,
            questions: lesson.questions,
          });
          report.unchanged++;
        } else {
          lesson.contentVersion = (prev?.contentVersion || 0) + 1;
          lessons.push(lesson);
          if (prev) {
            report.updated++;
            report.changedPages.push(l.url);
          } else report.new++;
        }
        console.log(
          lessons.length + '/' + report.lessonsDiscovered,
          l.id,
          lesson.questions.length + ' questions',
        );
      } catch (e) {
        report.parsingFailures.push(String(e));
        console.error(String(e));
      }
    }
  if (action === 'crawl') {
    if (report.parsingFailures.length)
      throw Error(report.parsingFailures.join('\n'));
    process.exit(0);
  }
  // Preserve unavailable content and all historical IDs. Never infer removals from failed fetches.
  if (!report.parsingFailures.length)
    for (const prev of old)
      if (!lessons.some((l) => l.id === prev.id)) {
        lessons.push({ ...prev, status: 'unavailable' });
        report.unavailable++;
      }
  for (const c of oldCourses)
    if (!courses.some((x) => x.id === c.id))
      courses.push({ ...c, status: 'unavailable' });
  report.validationFailures = validate(courses, lessons);
  await writeFile('reports/sync.json', JSON.stringify(report, null, 2));
  if (report.parsingFailures.length || report.validationFailures.length)
    throw Error('Import rejected. See reports/sync.json');
  await writeFile(
    'data/curriculum.json',
    JSON.stringify({ syncedAt: report.at, courses, lessons }, null, 2),
  );
  console.log(report);
}
