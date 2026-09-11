import { parseHTML } from 'linkedom';
import type { Question } from '$lib/model';
/** Structural DOM behavior; this parser never runs learner scripts or fetches resources. */
export function validateCode(question: Question, source: string) {
  if (source.length > 20000 || question.validator?.kind !== 'dom') return false;
  const { document } = parseHTML(
    '<!doctype html><html><body>' + source + '</body></html>',
  );
  const rule = question.validator,
    nodes = Array.from(document.querySelectorAll(rule.selector));
  return (
    nodes.length === (rule.count ?? 1) &&
    (rule.text === undefined ||
      nodes.every((n) => n.textContent?.trim() === rule.text))
  );
}
