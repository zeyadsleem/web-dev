import { db } from '$lib/server/db';
export const load = async ({ platform, url }) => {
  const query = (url.searchParams.get('q') || '').trim().slice(0, 100);
  if (query.length < 2) return { query, results: [] };
  const escaped = '%' + query.replace(/[!%_]/g, '!$&') + '%';
  const rows = await db(platform)
    .prepare(
      "SELECT l.id,l.title,l.description,c.title AS course FROM lessons l JOIN courses c ON c.id=l.course_id WHERE l.status='published' AND (l.title LIKE ? ESCAPE '!' OR l.search_text LIKE ? ESCAPE '!' OR c.title LIKE ? ESCAPE '!') ORDER BY c.path_order,l.position LIMIT 100",
    )
    .bind(escaped, escaped, escaped)
    .all<{ id: string; title: string; description: string; course: string }>();
  return { query, results: rows.results };
};
