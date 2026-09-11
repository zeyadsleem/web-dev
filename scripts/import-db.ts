import { gzipSync } from 'node:zlib';
import { readFile, writeFile } from 'node:fs/promises';
import type { Course, Lesson } from '../src/lib/model';
import { validate } from './curriculum';
const data: { syncedAt: string; courses: Course[]; lessons: Lesson[] } =
  JSON.parse(await readFile('data/curriculum.json', 'utf8'));
const errors = validate(data.courses, data.lessons);
if (errors.length) throw Error(errors.join('\n'));
const q = (v: unknown) =>
  v == null ? 'NULL' : "'" + String(v).replaceAll("'", "''") + "'";
const sql: string[] = [];
for (const c of data.courses)
  sql.push(
    `INSERT INTO courses VALUES (${[c.id, c.title, c.url, c.description, c.sourceOrder, c.pathOrder, c.status].map(q)}) ON CONFLICT(id) DO UPDATE SET title=excluded.title,description=excluded.description,source_order=excluded.source_order,path_order=excluded.path_order,status=excluded.status;`,
  );
for (const l of data.lessons) {
  const text = l.sections
    .map((s) => s.title + ' ' + s.blocks.map((b) => b.text).join(' '))
    .join('\n');
  sql.push(
    `INSERT INTO lessons VALUES (${[l.id, l.courseId, l.title, l.url, l.position, l.description, l.status, l.hash, l.contentVersion, l.importedAt, l.sourceUpdatedAt, l.parserVersion, JSON.stringify(l.authors), text].map(q)}) ON CONFLICT(id) DO UPDATE SET title=excluded.title,position=excluded.position,description=excluded.description,status=excluded.status,hash=excluded.hash,content_version=CASE WHEN lessons.hash<>excluded.hash THEN lessons.content_version+1 ELSE lessons.content_version END,imported_at=excluded.imported_at,source_updated_at=excluded.source_updated_at,parser_version=excluded.parser_version,authors=excluded.authors,search_text=excluded.search_text WHERE lessons.hash<>excluded.hash OR lessons.status<>excluded.status OR lessons.position<>excluded.position;`,
  );
  sql.push(
    `INSERT OR IGNORE INTO source_versions SELECT id,content_version,hash,${q('gzip-base64:' + gzipSync(JSON.stringify(l)).toString('base64'))},imported_at FROM lessons WHERE id=${q(l.id)};`,
  );
  sql.push(
    `UPDATE questions SET status='needs-review' WHERE lesson_id=${q(l.id)} AND source_hash<>${q(l.hash)};`,
  );
  for (const [i, s] of l.sections.entries())
    sql.push(
      `INSERT INTO lesson_sections VALUES (${[s.id, l.id, i, s.title, JSON.stringify(s.blocks)].map(q)}) ON CONFLICT(lesson_id,id) DO UPDATE SET position=excluded.position,title=excluded.title,blocks=excluded.blocks;`,
    );
  sql.push(
    `DELETE FROM lesson_sections WHERE lesson_id=${q(l.id)} AND id NOT IN (${l.sections.map((s) => q(s.id)).join(',')});`,
  );
  for (const x of l.questions)
    sql.push(
      `INSERT INTO questions VALUES (${[x.id, l.id, x.sectionId, x.type, JSON.stringify(x), x.status, x.sourceHash].map(q)}) ON CONFLICT(id) DO UPDATE SET section_id=excluded.section_id,type=excluded.type,payload=excluded.payload,status=excluded.status,source_hash=excluded.source_hash;`,
    );
}
const report = await readFile('reports/sync.json', 'utf8');
sql.push(
  `INSERT OR REPLACE INTO sync_runs VALUES (${[data.syncedAt, data.syncedAt, report].map(q)});`,
);
for (const statement of sql)
  if (Buffer.byteLength(statement) > 99000)
    throw Error(
      'Statement exceeds D1 limit; split the content row before import.',
    );
await writeFile('data/import.sql', sql.join('\n'));
console.log('Validated import SQL:', sql.length, 'statements');
