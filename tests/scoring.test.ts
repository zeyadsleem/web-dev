import { it, expect } from 'vitest';
import { scoreAnswer, percentage, validateQuestion } from '../src/lib/scoring';
import type { Question } from '../src/lib/model';
const q: Question = {
  id: 'a',
  lessonId: 'html/overview',
  sectionId: 'intro',
  type: 'multiple-select',
  prompt: 'Select both',
  options: ['a', 'b', 'c'],
  answer: ['0', '2'],
  explanation: '',
  hints: [],
  difficulty: 1,
  origin: 'source',
  status: 'validated',
  sourceHash: 'hash',
};
it('requires the complete answer set, rejects duplicates and extra choices', () => {
  expect(scoreAnswer(q, ['2', '0'])).toBe(true);
  for (const a of [['0'], ['0', '0'], ['0', '1', '2']])
    expect(scoreAnswer(q, a)).toBe(false);
});
it('preserves ordering for reorder tasks', () => {
  expect(scoreAnswer({ ...q, type: 'reorder' }, ['2', '0'])).toBe(false);
});
it('does not grade code using equality', () => {
  expect(() => scoreAnswer({ ...q, type: 'write-code' }, ['0', '2'])).toThrow(
    'behavior validation',
  );
});
it('rejects ambiguous and ungrounded questions', () => {
  expect(validateQuestion({ ...q, type: 'multiple-choice' })).toContain(
    'Single answer expected',
  );
  expect(validateQuestion({ ...q, sectionId: '' })).toContain(
    'Missing grounding',
  );
});
it('calculates completion only from imported counts', () => {
  expect(percentage(84, 246)).toBe(34);
  expect(percentage(0, 0)).toBe(0);
  expect(percentage(237, 237)).toBe(100);
});
