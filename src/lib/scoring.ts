import type { Question } from './model';
export function scoreAnswer(q: Question, answer: string[]): boolean {
  if (!Array.isArray(answer) || answer.some((x) => typeof x !== 'string'))
    return false;
  if (['fix-bug', 'complete-code', 'write-code', 'dom-css'].includes(q.type))
    throw Error('Code exercises require sandbox behavior validation.');
  const norm = (v: string) => v.trim().replace(/\r\n/g, '\n');
  const normalized =
    (q.type === 'reorder' || q.type === 'match') && answer.length === 1
      ? answer[0].split(/[,،]/)
      : answer;
  const a = normalized.map(norm),
    b = q.answer.map(norm);
  if (
    ['multiple-choice', 'multiple-select', 'true-false', 'find-bug'].includes(
      q.type,
    )
  )
    return (
      new Set(a).size === a.length &&
      a.length === b.length &&
      [...a].sort().every((x, i) => x === [...b].sort()[i])
    );
  return a.length === b.length && a.every((x, i) => x === b[i]);
}
export function percentage(completed: number, total: number) {
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}
export function validateQuestion(q: Question) {
  const errors: string[] = [];
  if (!q.prompt.trim() || !q.sectionId || !q.sourceHash)
    errors.push('Missing grounding');
  if (!q.answer.length && !q.validator) errors.push('Missing answer');
  if (new Set(q.options).size !== q.options.length)
    errors.push('Duplicate options');
  if (q.type === 'multiple-choice' && q.answer.length !== 1)
    errors.push('Single answer expected');
  if (q.type === 'multiple-select' && q.answer.length < 2)
    errors.push('Multiple answers expected');
  if (
    ['write-code', 'dom-css', 'complete-code', 'fix-bug'].includes(q.type) &&
    !q.validator
  )
    errors.push('Behavior validator required');
  return errors;
}
