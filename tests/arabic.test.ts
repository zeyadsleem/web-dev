import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseLesson } from '../scripts/parser';
import { enrich } from '../scripts/enrichment';
import { arabicSource, statusLabel } from '../src/lib/arabic';
it('imports Arabic source text and preserves literal code', () => {
  const lesson = parseLesson(
    '<html lang="ar-x-mtfrom-en"><h1>مقدمة في البرمجة</h1><div class="devsite-article-body"><p>تساعدك <strong>البرمجة</strong> على بناء تطبيقات مفيدة وفهم طريقة عمل المتصفح من خلال دراسة الأمثلة وتجربتها.</p><pre>const x = "Hello";</pre></div></html>',
    {
      id: 'test/arabic',
      courseId: 'test',
      url: 'https://web.dev/learn/test/arabic',
      position: 0,
    },
  );
  expect(lesson.language).toBe('ar');
  expect(lesson.sections[0].title).toBe('مقدمة');
  expect(lesson.sections[0].blocks[1].text).toBe('const x = "Hello";');
  const questions = enrich(lesson);
  expect(questions[0].prompt).toContain('أكمل');
  expect(questions[0].answer).toEqual(['البرمجة']);
});
it('localizes source links and progress labels without changing stored identifiers', () => {
  expect(arabicSource('https://web.dev/learn/ai/introduction#models')).toBe(
    'https://web.dev/learn/ai/introduction?hl=ar#models',
  );
  expect(statusLabel('completed')).toBe('مكتمل');
  expect(statusLabel(null)).toBe('لم يبدأ');
  expect(readFileSync('src/app.html', 'utf8')).toContain('lang="ar" dir="rtl"');
});
