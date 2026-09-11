import { load } from 'cheerio';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import robotsParser from 'robots-parser';
import { dirname } from 'node:path';
export const locale = process.env.CURRICULUM_LANGUAGE || 'ar';
const root = 'https://web.dev';
let robots = robotsParser(
  root + '/robots.txt',
  await readFile('data/robots.txt', 'utf8'),
);
export async function fetchPage(
  url: string,
  path: string,
  refresh = false,
  lang: string = locale,
): Promise<string> {
  if (
    new URL(url).origin !== root ||
    !new URL(url).pathname.startsWith('/learn/')
  )
    throw Error('Out-of-scope crawl URL');
  if (!robots.isAllowed(url, 'LearnLab/1.0'))
    throw new Error('Robots disallows ' + url);
  const languageRe = new RegExp('<html[^>]*lang="' + lang + '(?:-[^"]*)?"');
  if (!refresh)
    try {
      const cached = await readFile(path, 'utf8');
      if (languageRe.test(cached)) return cached;
    } catch {}
  for (let attempt = 0; attempt < 4; attempt++) {
    await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
    try {
      const requestUrl = new URL(url);
      requestUrl.searchParams.set('hl', lang);
      const res = await fetch(requestUrl, {
        headers: {
          'Accept-Language': lang,
          'User-Agent': 'LearnLab/1.0 (educational curriculum sync)',
        },
        signal: AbortSignal.timeout(45000),
      });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      const html = await res.text();
      await mkdir(dirname(path), { recursive: true });
      if (languageRe.test(html)) await writeFile(path, html);
      return html;
    } catch (e) {
      if (attempt === 3) throw e;
    }
  }
  throw new Error('fetch failed');
}
export const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
export function links(html: string, base: string, course?: string) {
  const $ = load(html),
    found = new Map<string, { url: string; title: string }>();
  const selector = course
    ? '.devsite-article-body a[href], .devsite-article-body [path]'
    : '.devsite-article-body h3 a[href]';
  $(selector).each((_, el) => {
    const a = $(el);
    const url = new URL(a.attr('href') || a.attr('path') || '', base);
    url.search = '';
    url.hash = '';
    url.pathname = url.pathname.replace(/\/$/, '');
    if (
      url.origin !== root ||
      !(course
        ? url.pathname.startsWith('/learn/' + course + '/')
        : /^\/learn\/[^/]+$/.test(url.pathname))
    )
      return;
    const title = clean(
      a
        .find(
          '.devsite-playlist-item-title, .devsite-playlist-item-title-text, h2, h3',
        )
        .first()
        .text() || a.text(),
    );
    if (!found.has(url.href) || (!found.get(url.href)?.title && title))
      found.set(url.href, { url: url.href, title });
  });
  return [...found.values()];
}
if (process.argv[1]?.endsWith('discover.ts')) {
  type DiscoveredLesson = {
    id: string;
    url: string;
    title: string;
    position: number;
  };
  type DiscoveredCourse = {
    slug: string;
    title: string;
    url: string;
    description: string;
    sourceOrder: number;
    quizPages: string[];
    lessons: DiscoveredLesson[];
    special: string[];
  };
  await mkdir('reports', { recursive: true });
  const refresh = process.argv.includes('--refresh');
  if (refresh) {
    const response = await fetch(root + '/robots.txt', {
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw Error('Cannot verify robots.txt');
    const rules = await response.text();
    await writeFile('data/robots.txt', rules);
    robots = robotsParser(root + '/robots.txt', rules);
  }
  const index = await fetchPage(
    root + '/learn/',
    `data/raw/${locale}/index.html`,
    refresh,
  );
  const previous = JSON.parse(
    await readFile('data/discovery.json', 'utf8').catch(() => '{"courses":[]}'),
  );
  const courses: DiscoveredCourse[] = [];
  for (const [i, c] of links(index, root + '/learn/').entries()) {
    const slug = c.url.split('/').at(-1)!;
    const html = await fetchPage(
      c.url,
      `data/raw/${locale}/${slug}.html`,
      refresh,
    );
    const $ = load(html);
    const lessons = links(html, c.url, slug).map((l, position) => ({
      ...l,
      id: new URL(l.url).pathname.slice(7),
      position,
    }));
    if (!lessons.length) throw new Error('No lessons for ' + slug);
    const special =
      clean($('.devsite-article-body').text()).match(
        /.{0,50}coming soon.{0,100}/gi,
      ) || [];
    const quizPages = [
      ...new Set(
        $('a[href]')
          .map((_, a) => new URL($(a).attr('href') || '', c.url).href)
          .get()
          .filter(
            (u) =>
              u.startsWith(root + '/learn/quizzes/' + slug) ||
              u === root + '/learn/' + slug + '/quiz',
          ),
      ),
    ];
    courses.push({
      ...c,
      slug,
      sourceOrder: i,
      quizPages,
      description: $('meta[name="description"]').attr('content') || '',
      lessons,
      special,
    });
    console.log(slug, lessons.length);
  }
  // Localized indexes can lag behind published translations: retain known URLs.
  for (const prior of previous.courses) {
    let course = courses.find((c) => c.slug === prior.slug);
    if (!course) {
      const html = await fetchPage(
        prior.url,
        `data/raw/${locale}/${prior.slug}.html`,
        refresh,
      );
      const $ = load(html);
      const heading = $('h1').first().clone();
      heading.find('devsite-actions').remove();
      course = {
        ...prior,
        title: clean(heading.text()),
        description: $('meta[name="description"]').attr('content') || '',
      };
      courses.push(course!);
    }
    for (const lesson of prior.lessons)
      if (!course!.lessons.some((l) => l.id === lesson.id))
        course!.lessons.push(lesson);
    course!.lessons.sort((a, b) => a.position - b.position);
  }
  await writeFile(
    'data/discovery.json',
    JSON.stringify(
      { discoveredAt: new Date().toISOString(), courses },
      null,
      2,
    ),
  );
  await writeFile(
    'reports/discovery.md',
    '# Live curriculum discovery\n\n' +
      new Date().toISOString() +
      '\n\n' +
      courses
        .map(
          (c) =>
            `## ${c.title}\n${c.url}\n\n${c.lessons.length} published lesson links. Source position: ${c.sourceOrder + 1}.\n\n${c.lessons.map((l, i) => `${i + 1}. [${l.title || l.id}](${l.url})`).join('\n')}\n\nSpecial notices: ${c.special.join('; ') || 'None detected'}\n\nSource quiz links: ${c.quizPages.join(', ') || 'None on course page'}`,
        )
        .join('\n\n') +
      '\n\nOrdering comes from course article cards. Lesson content needs semantic extraction, including source quiz widgets and embedded examples. Nested URLs are preserved. New courses without a configured path position require review.\n',
  );
}
