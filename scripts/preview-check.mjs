import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
await page.screenshot({ path: 'reports/dashboard.png', fullPage: true });
const navigation = await page.evaluate(() => {
  const n = performance.getEntriesByType('navigation')[0];
  return n ? JSON.parse(JSON.stringify(n)) : null;
});
await page.goto('http://127.0.0.1:4173/courses/ai/assessment', {
  waitUntil: 'networkidle',
});
const assessmentQuestions = await page.locator('.question').count();
await writeFile(
  'reports/performance.json',
  JSON.stringify(
    {
      environment:
        'Local production Cloudflare Worker; single desktop navigation; not a field performance benchmark',
      navigation,
      assessmentQuestions,
      pageErrors: errors,
    },
    null,
    2,
  ),
);
console.log({
  assessmentQuestions,
  pageErrors: errors,
  ttfb: navigation?.responseStart,
  domContentLoaded: navigation?.domContentLoadedEventEnd,
});
await browser.close();
