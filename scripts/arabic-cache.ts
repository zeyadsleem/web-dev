import { readFile } from 'node:fs/promises';
import { fetchPage } from './discover';
const discovery = JSON.parse(await readFile('data/discovery.json', 'utf8'));
const queue: { id: string; url: string }[] = discovery.courses.flatMap(
  (c: { lessons: { id: string; url: string }[] }) => c.lessons,
);
let count = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const lesson = queue.shift()!;
      await fetchPage(
        lesson.url,
        `data/raw/ar/lessons/${lesson.id.replaceAll('/', '__')}.html`,
      );
      console.log(++count, lesson.id);
    }
  }),
);
