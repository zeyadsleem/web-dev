import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import type { Lesson } from '../../src/lib/model';
const token = 'e2e-local-only-session';
test.beforeEach(async ({ page }) => {
  await page.route('https://web.dev/**', (route) => route.abort());
});
test('curriculum includes AI and has no critical accessibility violations', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'مسار تعلّمك' }),
  ).toBeVisible();
  await expect(page.locator('a[href="/courses/ai"]')).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    ),
  ).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: 'reports/mobile.png', fullPage: true });
});
test('study, fail, review, answer, complete, and resume persisted — التقدم', async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: 'session',
      value: token,
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  const data = JSON.parse(readFileSync('data/curriculum.json', 'utf8')) as {
    lessons: Lesson[];
  };
  const lesson = data.lessons.find((l) => l.id === 'html/overview')!;
  await page.goto('/lessons/html/overview', { waitUntil: 'domcontentloaded' });
  const source = lesson.questions.find((q) => q.origin === 'source')!;
  let card = page.locator('.question').filter({
    has: page.getByRole('heading', { name: source.prompt, exact: true }),
  });
  const incorrect = source.options.findIndex(
    (_, i) => !source.answer.includes(String(i)),
  );
  await card.locator(`input[value="${incorrect}"]`).check();
  await card.getByRole('button', { name: 'تحقق من الإجابة' }).click();
  await expect(card.getByRole('status')).toContainText('الإجابة غير صحيحة');
  await page.goto('/review', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: source.prompt, exact: true }),
  ).toBeVisible();
  await page.goto('/lessons/html/overview', { waitUntil: 'domcontentloaded' });
  for (const q of lesson.questions) {
    card = page.locator('.question').filter({
      has: page.getByRole('heading', { name: q.prompt, exact: true }),
    });
    if (q.options.length) {
      for (const a of q.answer)
        await card.locator(`input[value="${a}"]`).check();
    } else {
      await card
        .locator('textarea')
        .fill(
          q.validator
            ? '<H1 class="ok"><span>Hello, web.</span></H1>'
            : q.answer[0],
        );
    }
    await card.getByRole('button', { name: 'تحقق من الإجابة' }).click();
    await expect(card.getByRole('status')).toContainText('إجابة صحيحة.');
  }
  await page
    .getByRole('button', { name: 'Complete lesson & save — التقدم' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'أكملت الدرس. أحسنت!' }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'أكملت الدرس. أحسنت!' }),
  ).toBeVisible();
  await page.goto('/review', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'لا توجد أسئلة للمراجعة حاليًا.' }),
  ).toBeVisible();
  await page.goto('/lessons/html/document-structure', {
    waitUntil: 'domcontentloaded',
  });
  const saved = page.waitForResponse(
    (r) =>
      r.url().endsWith('/api/position') &&
      r.request().postDataJSON().lessonId === 'html/document-structure' &&
      r.status() === 200,
  );
  await page.locator('.learning-section').nth(1).scrollIntoViewIfNeeded();
  await saved;
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.continue')).toContainText(
    data.lessons.find((l) => l.id === 'html/document-structure')!.title,
  );
});
test('playground renders HTML, runs isolated JS, and stops infinite loops', async ({
  page,
}) => {
  await page.goto('/lessons/html/overview', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'افتح ساحة تجربة الأكواد' }).click();
  const editor = page.getByRole('textbox', { name: 'محرر الأكواد' });
  await editor.fill('<h1>Preview works</h1>');
  await page.getByRole('button', { name: 'شغّل الكود' }).click();
  await expect(
    page
      .frameLocator('iframe[title="معاينة الكود في بيئة معزولة"]')
      .getByRole('heading', { name: 'Preview works' }),
  ).toBeVisible();
  await page.getByLabel('اللغة').selectOption('javascript');
  await editor.fill('console.log(2 + 3)');
  await page.getByRole('button', { name: 'شغّل الكود' }).click();
  await expect(page.getByLabel('نتائج التنفيذ')).toHaveText('5');
  await editor.fill(
    'try { console.log(parent.document.cookie) } catch(e) { console.log("isolated") }',
  );
  await page.getByRole('button', { name: 'شغّل الكود' }).click();
  await expect(page.getByLabel('نتائج التنفيذ')).toContainText('isolated');
  await editor.fill('while(true) {}');
  await page.getByRole('button', { name: 'شغّل الكود' }).click();
  await page.waitForTimeout(2800);
  await expect(page.getByRole('button', { name: 'شغّل الكود' })).toBeEnabled();
});
test('search, protected routes, and missing lessons', async ({ page }) => {
  await page.goto('/search?q=' + encodeURIComponent('الذكاء الاصطناعي'), {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.locator('.review-row').first()).toBeVisible();
  await page.goto('/admin', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'احفظ مكانك في التعلّم.' }),
  ).toBeVisible();
  const response = await page.goto('/lessons/not-a-lesson', {
    waitUntil: 'domcontentloaded',
  });
  expect(response?.status()).toBe(404);
});
