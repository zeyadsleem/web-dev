import { codeToHtml } from 'shiki';

const cache = new Map<string, Promise<string>>();

const languages: Record<string, string> = {
  HTML: 'html',
  CSS: 'css',
  'CSS+Lasso': 'text',
  JavaScript: 'javascript',
  TypeScript: 'typescript',
  JSON: 'json',
  Markdown: 'markdown',
  Bash: 'bash',
  'Bash Session': 'bash',
  Python: 'python',
  PHP: 'php',
  XML: 'xml',
  Java: 'java',
  GDScript: 'text',
  GAS: 'text',
  Carbon: 'text',
  verilog: 'text',
  'Transact-SQL': 'text',
  'Text only': 'text',
  none: 'text',
};

export function highlightCode(
  code: string,
  language?: string,
): Promise<string> {
  const lang = languages[language || ''] || 'text';
  const key = lang + '\u0000' + code;
  let run = cache.get(key);
  if (!run) {
    run = codeToHtml(code, {
      lang,
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: 'light',
    });
    cache.set(key, run);
  }
  return run;
}
