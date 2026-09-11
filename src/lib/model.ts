export type Block = {
  type:
    | 'paragraph'
    | 'heading'
    | 'code'
    | 'list'
    | 'table'
    | 'image'
    | 'callout'
    | 'embed';
  text: string;
  html?: string;
  level?: number;
  language?: string;
  url?: string;
  alt?: string;
};
export type Section = { id: string; title: string; blocks: Block[] };
export type QuestionType =
  | 'multiple-choice'
  | 'multiple-select'
  | 'true-false'
  | 'short-answer'
  | 'fill-blank'
  | 'predict-output'
  | 'find-bug'
  | 'fix-bug'
  | 'complete-code'
  | 'reorder'
  | 'match'
  | 'write-code'
  | 'dom-css';
export type Question = {
  id: string;
  lessonId: string;
  sectionId: string;
  type: QuestionType;
  prompt: string;
  options: string[];
  answer: string[];
  explanation: string;
  hints: string[];
  difficulty: number;
  origin: 'source' | 'generated' | 'manual';
  status: 'validated' | 'needs-review';
  sourceHash: string;
  validator?:
    | { kind: 'dom'; selector: string; count?: number; text?: string }
    | { kind: 'output'; expected: string };
  starter?: string;
};
export type Lesson = {
  language?: 'ar' | 'en';
  id: string;
  courseId: string;
  title: string;
  url: string;
  position: number;
  description: string;
  sections: Section[];
  questions: Question[];
  authors: string[];
  hash: string;
  importedAt: string;
  sourceUpdatedAt: string | null;
  parserVersion: string;
  contentVersion: number;
  status: 'published' | 'unavailable' | 'coming-soon';
};
export type Course = {
  id: string;
  title: string;
  url: string;
  description: string;
  sourceOrder: number;
  pathOrder: number | null;
  status: string;
};
export type Progress = {
  lesson_id: string;
  status: string;
  section_id: string;
  score: number | null;
  attempts: number;
  last_activity: string;
  completed_at: string | null;
  scroll_offset: number;
};
