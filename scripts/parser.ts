import { load } from 'cheerio';
import type { AnyNode, Element } from 'domhandler';
import { createHash } from 'node:crypto';
import type { Lesson, Section, Block, Question } from '../src/lib/model';
export const PARSER_VERSION = '1.1.0';
export const hash = (x: string) => createHash('sha256').update(x).digest('hex');
const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
export function parseLesson(
  html: string,
  meta: { id: string; courseId: string; url: string; position: number },
): Lesson {
  const $ = load(html),
    body = $('.devsite-article-body').first();
  const language = $('html').attr('lang')?.split('-')[0];
  if (language !== 'ar' && language !== 'en')
    throw Error('Unsupported source language: ' + meta.url);
  const ar = language === 'ar';
  if (!body.length) throw Error('Missing article body: ' + meta.url);
  const heading = $('h1').first().clone();
  heading.find('devsite-actions').remove();
  const title = clean(heading.text());
  if (!title) throw Error('Missing title');
  body
    .find('script,style,devsite-actions,devsite-toc,.devsite-banner')
    .remove();
  body.find('devsite-quiz').each((_, e) => {
    const quiz = $(e);
    quiz
      .find(
        'button,input,.devsite-quiz-submit-error,.devsite-quiz-rating,.devsite-quiz-footer,.devsite-quiz-feedback',
      )
      .remove();
    quiz.append(
      ar
        ? '<p>اختبار المصدر: التصحيح متاح على web.dev. لم ينشر المصدر نموذج إجابة لهذه الأسئلة.</p>'
        : '<p>Source assessment: grading is provided on web.dev. This imported question text has no published answer key.</p>',
    );
  });
  const sanitized = (node: AnyNode) => {
    const fragment = load($.html(node), null, false);
    fragment('*').each((_, el) => {
      if (el.type !== 'tag') return;
      const tag = el.tagName;
      for (const key of Object.keys(el.attribs))
        if (!['href', 'colspan', 'rowspan', 'src', 'alt'].includes(key))
          fragment(el).removeAttr(key);
      if (tag === 'img') {
        const raw = fragment(el).attr('src');
        try {
          const u = new URL(raw || '', meta.url);
          if (u.protocol !== 'https:')
            fragment(el).replaceWith(
              fragment('<span></span>').text(fragment(el).attr('alt') || ''),
            );
          else
            fragment(el)
              .attr('src', u.href)
              .attr('loading', 'lazy')
              .attr('referrerpolicy', 'no-referrer');
        } catch {
          fragment(el).remove();
        }
      }
      if (tag === 'a') {
        const raw = fragment(el).attr('href');
        try {
          const u = new URL(raw || '', meta.url);
          if (!['https:', 'http:'].includes(u.protocol))
            fragment(el).removeAttr('href');
          else {
            if (ar && u.hostname === 'web.dev') u.searchParams.set('hl', 'ar');
            fragment(el).attr('href', u.href);
          }
        } catch {
          fragment(el).removeAttr('href');
        }
      }
      if (
        ![
          'img',
          'pre',
          'p',
          'a',
          'code',
          'em',
          'strong',
          'b',
          'i',
          'ul',
          'ol',
          'li',
          'table',
          'thead',
          'tbody',
          'tr',
          'td',
          'th',
          'br',
          'span',
          'sub',
          'sup',
          'caption',
          'dl',
          'dt',
          'dd',
        ].includes(tag)
      )
        fragment(el).replaceWith(fragment(el).contents());
    });
    return fragment.html();
  };
  const sections: Section[] = [
      { id: 'introduction', title: ar ? 'مقدمة' : 'Introduction', blocks: [] },
    ],
    questions: Question[] = [];
  const add = (b: Block) => sections.at(-1)!.blocks.push(b);
  const visit = (node: AnyNode) => {
    if (node.type === 'text') {
      if (clean(node.data)) add({ type: 'paragraph', text: clean(node.data) });
      return;
    }
    if (node.type !== 'tag') return;
    const el = $(node),
      tag = (node as Element).tagName;
    if (/^h[2-6]$/.test(tag)) {
      const text = clean(el.text());
      let id = el.attr('id') || 'section-' + sections.length;
      const base = id;
      let occurrence = 2;
      while (sections.some((s) => s.id === id)) id = base + '--' + occurrence++;
      sections.push({ id, title: text, blocks: [] });
      return;
    }
    if (tag === 'devsite-multiple-choice') {
      const children = el.children('div'),
        prompt = children.first().text().trim(),
        options: string[] = [],
        answer: string[] = [],
        explanations: string[] = [];
      children.slice(1).each((i, opt) => {
        const o = $(opt);
        options.push(o.children().first().text().trim());
        explanations.push(clean(o.children().eq(1).text()));
        if (o.attr('correct') !== undefined) answer.push(String(i));
      });
      if (!options.length || !answer.length)
        throw Error('Unparseable source quiz ' + meta.url);
      questions.push({
        id: meta.id + ':q:' + hash(prompt).slice(0, 12),
        lessonId: meta.id,
        sectionId: sections.at(-1)!.id,
        type: answer.length > 1 ? 'multiple-select' : 'multiple-choice',
        prompt,
        options,
        answer,
        explanation: explanations
          .map((e, i) => `${options[i]}: ${e}`)
          .join('\n'),
        hints: [
          ar
            ? 'راجع هذا الجزء من الدرس قبل المحاولة مرة أخرى.'
            : 'Revisit the source section before trying again.',
        ],
        difficulty: 1,
        origin: 'source',
        status: 'validated',
        sourceHash: '',
      });
      return;
    }
    if (tag === 'pre') {
      add({
        type: 'code',
        text: el.text(),
        language:
          el.attr('syntax') || el.find('code').attr('data-language') || '',
      });
      return;
    }
    if (tag === 'img') {
      const url = new URL(el.attr('src') || '', meta.url);
      if (url.protocol === 'https:')
        add({
          type: 'image',
          text: el.attr('alt') || '',
          alt: el.attr('alt') || '',
          url: url.href,
        });
      else if (el.attr('alt'))
        add({ type: 'paragraph', text: el.attr('alt')! });
      return;
    }
    if (tag === 'iframe' || tag === 'video') {
      const raw = el.attr('src') || el.find('source').attr('src');
      if (raw) {
        const u = new URL(raw, meta.url);
        if (u.protocol === 'https:')
          add({
            type: 'embed',
            text:
              el.attr('title') ||
              (ar ? 'مثال تفاعلي من المصدر' : 'Interactive source example'),
            url: u.href,
          });
      }
      return;
    }
    if (['ul', 'ol', 'table', 'dl'].includes(tag)) {
      add({
        type: tag === 'table' ? 'table' : 'list',
        text: clean(el.text()),
        html: sanitized(node),
      });
      return;
    }
    if (tag === 'p') {
      if (el.find('img,iframe').length) {
        el.contents().each((_, c) => visit(c));
        return;
      }
      if (clean(el.text()))
        add({
          type: 'paragraph',
          text: clean(el.text()),
          html: sanitized(node),
        });
      return;
    }
    if (tag === 'aside' || tag === 'blockquote') {
      add({ type: 'callout', text: clean(el.text()), html: sanitized(node) });
      return;
    }
    el.contents().each((_, child) => visit(child));
  };
  body.contents().each((_, el) => visit(el));
  body.find('.devsite-quiz-question').each((_, el) => {
    const item = $(el);
    const prompt = item.find('.devsite-quiz-question-header').text().trim();
    const options = item
      .find('.devsite-quiz-answer label')
      .map((_, o) => $(o).text().trim())
      .get();
    if (prompt && options.length)
      questions.push({
        id: meta.id + ':external:' + hash(prompt).slice(0, 12),
        lessonId: meta.id,
        sectionId: sections[0].id,
        type: item.attr('data-type')?.includes('multiple_answer')
          ? 'multiple-select'
          : 'multiple-choice',
        prompt,
        options,
        answer: [],
        explanation: ar
          ? 'لم ينشر المصدر نموذج الإجابة؛ يحتاج السؤال إلى مراجعة.'
          : 'The answer key is not published in the source HTML; review is required.',
        hints: [ar ? 'راجع الكورس الأصلي.' : 'Consult the original course.'],
        difficulty: 2,
        origin: 'source',
        status: 'needs-review',
        sourceHash: '',
      });
  });

  const sourceCode = body
      .find('pre')
      .filter((_, e) => !$(e).parents('devsite-multiple-choice').length).length,
    parsedCode = sections
      .flatMap((s) => s.blocks)
      .reduce(
        (n, b) =>
          n +
          (b.type === 'code' ? 1 : 0) +
          (b.html ? (b.html.match(/<pre[ >]/g) || []).length : 0),
        0,
      );
  if (sourceCode !== parsedCode)
    throw Error(`Lost code blocks ${sourceCode}/${parsedCode}: ${meta.url}`);
  if (sections.flatMap((s) => s.blocks).length < 1)
    throw Error('Empty lesson ' + meta.url);
  const contentHash = hash(JSON.stringify({ title, sections, questions }));
  questions.forEach((q) => (q.sourceHash = contentHash));
  return {
    ...meta,
    language,
    title,
    description: $('meta[name="description"]').attr('content') || '',
    sections,
    questions,
    authors: [
      ...new Set(
        $('.devsite-author-name')
          .map((_, e) => clean($(e).text()))
          .get(),
      ),
    ],
    hash: contentHash,
    importedAt: new Date().toISOString(),
    sourceUpdatedAt:
      html.match(/Last updated (\d{4}-\d{2}-\d{2})/)?.[1] || null,
    parserVersion: PARSER_VERSION,
    contentVersion: 1,
    status: meta.url.endsWith('/coming-soon') ? 'coming-soon' : 'published',
  };
}
