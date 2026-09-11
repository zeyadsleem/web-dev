import { it, expect } from 'vitest';
import { validateCode } from '../src/lib/server/code-validation';
import type { Question } from '../src/lib/model';
const q = {
  validator: { kind: 'dom', selector: 'h1', count: 1, text: 'Hello, web.' },
} as Question;
it('accepts equivalent HTML structures without string equality', () => {
  expect(validateCode(q, '<H1 class="title">Hello, web.</H1>')).toBe(true);
  expect(validateCode(q, '<h1><span>Hello, web.</span></h1>')).toBe(true);
  expect(validateCode(q, '<p>Hello, web.</p>')).toBe(false);
  expect(validateCode(q, '<h1>Hello, web.</h1><h1>Again</h1>')).toBe(false);
});
it('never evaluates learner script', () => {
  expect(
    validateCode(
      q,
      '<script>throw new Error("executed")</script><h1>Hello, web.</h1>',
    ),
  ).toBe(true);
});
