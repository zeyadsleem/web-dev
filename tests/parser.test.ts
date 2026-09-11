import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseLesson } from '../scripts/parser';
import { links } from '../scripts/discover';
const html = readFileSync('tests/fixtures/html-overview.html', 'utf8');
const meta = {
  id: 'html/overview',
  courseId: 'html',
  position: 1,
  url: 'https://web.dev/learn/html/overview',
};
describe('source parser', () => {
  it('retains semantic content, exact code and multiple-answer quizzes', () => {
    const l = parseLesson(html, meta);
    expect(l.title).toBe('Overview of HTML');
    expect(l.questions).toHaveLength(3);
    expect(l.questions[1].type).toBe('multiple-select');
    expect(l.questions[1].answer).toEqual(['0', '3']);
    expect(
      l.sections.flatMap((s) => s.blocks).filter((b) => b.type === 'code'),
    ).toHaveLength(6);
    expect(
      l.sections.flatMap((s) => s.blocks).some((b) => b.type === 'embed'),
    ).toBe(true);
  });
  it('is stable across imports and ignores chrome', () => {
    expect(parseLesson(html, meta).hash).toBe(parseLesson(html, meta).hash);
    expect(parseLesson(html, meta).title).not.toContain('collections');
  });
  it('fails loudly when article selectors disappear', () => {
    expect(() =>
      parseLesson('<html lang="en"><h1>Lesson</h1></html>', meta),
    ).toThrow('Missing article');
  });
  it('rejects unexpected translations', () => {
    expect(() =>
      parseLesson(html.replace('lang="en"', 'lang="fr"'), meta),
    ).toThrow('Unsupported source language');
  });
  it('does not emit executable source HTML', () => {
    const l = parseLesson(
      html.replace(
        '<p>',
        '<p onclick="evil()"><script>evil()</script><a href="javascript:evil()">link</a>',
      ),
      meta,
    );
    expect(JSON.stringify(l.sections)).not.toContain('onclick');
    expect(JSON.stringify(l.sections)).not.toContain('javascript:');
    expect(
      l.sections
        .flatMap((s) => s.blocks)
        .map((b) => b.html || '')
        .join(''),
    ).not.toContain('<script>');
  });
  it('discovers nested lesson URLs without duplicates or external pages', () => {
    const page =
      '<div class="devsite-article-body"><a href="/learn/javascript/classes">Classes</a><a href="/learn/javascript/classes/extends">Extends</a><a href="/learn/javascript/classes/extends#x">Again</a><a href="https://evil.test/learn/javascript/a">Outside</a></div>';
    expect(
      links(page, 'https://web.dev/learn/javascript', 'javascript').map(
        (x) => x.url,
      ),
    ).toEqual([
      'https://web.dev/learn/javascript/classes',
      'https://web.dev/learn/javascript/classes/extends',
    ]);
  });
});
it('preserves code inside quiz prompts without mistaking it for lost article code', () => {
  const l = parseLesson(
    readFileSync('tests/fixtures/css-box-model.html', 'utf8'),
    {
      id: 'css/box-model',
      courseId: 'css',
      position: 1,
      url: 'https://web.dev/learn/css/box-model',
    },
  );
  expect(l.questions[0].prompt).toContain('box');
  expect(
    l.sections.flatMap((s) => s.blocks).filter((b) => b.type === 'code'),
  ).toHaveLength(4);
});
it('disambiguates source heading IDs without overwriting sections', () => {
  const l = parseLesson(
    '<html lang="en"><h1>Test</h1><div class="devsite-article-body"><h2 id="introduction">Intro</h2><p>One.</p><h2 id="introduction">Another</h2><p>Two.</p></div></html>',
    meta,
  );
  expect(new Set(l.sections.map((s) => s.id)).size).toBe(l.sections.length);
});
it('retains images inside tables and removes their executable attributes', () => {
  const l = parseLesson(
    '<html lang="en"><h1>Media</h1><div class="devsite-article-body"><table><tr><td><img src="/example.png" alt="Example diagram" onerror="evil()"></td></tr></table></div></html>',
    meta,
  );
  const table = l.sections
    .flatMap((s) => s.blocks)
    .find((b) => b.type === 'table');
  expect(table?.html).toContain('https://web.dev/example.png');
  expect(table?.html).toContain('alt="Example diagram"');
  expect(table?.html).not.toContain('onerror');
});
