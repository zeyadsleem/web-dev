import { it, expect } from 'vitest';
import { parseLesson } from '../scripts/parser';
import { enrich } from '../scripts/enrichment';
import { readFileSync } from 'node:fs';
const meta = {
  id: 'html/overview',
  courseId: 'html',
  position: 1,
  url: 'https://web.dev/learn/html/overview',
};
it('changes source fingerprints only when curriculum content changes', () => {
  const html = readFileSync('tests/fixtures/html-overview.html', 'utf8');
  const a = parseLesson(html, meta),
    b = parseLesson(
      html.replace('standard markup language', 'widely used markup language'),
      meta,
    );
  expect(a.hash).not.toBe(b.hash);
  expect(a.id).toBe(b.id);
  expect(a.questions[0].id).toBe(b.questions[0].id);
  expect(a.questions[0].sourceHash).not.toBe(b.questions[0].sourceHash);
});
it('generated exact-quote questions are grounded and reproducible', () => {
  const l = parseLesson(
    readFileSync('tests/fixtures/html-overview.html', 'utf8'),
    meta,
  );
  const qs = enrich(l);
  expect(qs).toEqual(enrich(l));
  for (const q of qs.filter((q) => q.origin === 'generated')) {
    expect(q.explanation).toContain(q.answer[0]);
    expect(q.prompt.replace('_____ ', q.answer[0] + ' ')).toBeTruthy();
    expect(q.sourceHash).toBe(l.hash);
  }
});
