import { readFile, writeFile } from 'node:fs/promises';
import { validateQuestion } from '../src/lib/scoring';
import type { Lesson, Question } from '../src/lib/model';
const data: { lessons: Lesson[] } = JSON.parse(
  await readFile('data/curriculum.json', 'utf8'),
);
if (process.argv[2] === 'generate') {
  const drafts: Question[] = [];
  for (const l of data.lessons)
    for (const section of l.sections) {
      const paragraph = section.blocks.find(
        (b) => b.type === 'paragraph' && b.text.length > 80,
      );
      if (!paragraph) continue;
      const term = paragraph.text.match(/\b[A-Z][A-Za-z]{3,}\b/)?.[0];
      if (!term) continue;
      drafts.push({
        id: l.id + ':generated:' + section.id,
        lessonId: l.id,
        sectionId: section.id,
        type: 'fill-blank',
        prompt:
          'Complete this statement from the lesson:\n' +
          paragraph.text.replace(term, '_____'),
        options: [],
        answer: [term],
        explanation: paragraph.text,
        hints: ['Read the referenced section.'],
        difficulty: 1,
        origin: 'generated',
        status: 'needs-review',
        sourceHash: l.hash,
      });
    }
  await writeFile('data/question-drafts.json', JSON.stringify(drafts, null, 2));
  console.log(
    drafts.length,
    'grounded drafts generated. Human review required before publication.',
  );
} else {
  const errors = data.lessons.flatMap((l) =>
    l.questions
      .filter((q) => q.status === 'validated')
      .flatMap((q) => validateQuestion(q).map((e) => q.id + ': ' + e)),
  );
  if (errors.length) throw Error(errors.join('\n'));
  console.log('All published questions pass structural validation.');
}
