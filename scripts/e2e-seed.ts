import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
// Tooling-only fixture. Run before Vite opens the local D1 database.
const token = 'e2e-local-only-session',
  user = 'e2e-local-only-user';
const hash = createHash('sha256').update(token).digest('hex');
writeFileSync(
  '/tmp/learnlab-e2e.sql',
  `INSERT OR IGNORE INTO users(id,name) VALUES ('${user}','Test learner');DELETE FROM review_queue WHERE user_id='${user}';DELETE FROM question_attempts WHERE user_id='${user}';DELETE FROM quiz_attempts WHERE user_id='${user}';DELETE FROM course_assessment_attempts WHERE user_id='${user}';DELETE FROM lesson_progress WHERE user_id='${user}';INSERT OR REPLACE INTO sessions VALUES ('${hash}','${user}',${Date.now() + 3600000});`,
);
execFileSync(
  'npx',
  [
    'wrangler',
    'd1',
    'execute',
    'learn-lab',
    '--local',
    '--file',
    '/tmp/learnlab-e2e.sql',
  ],
  { stdio: 'pipe' },
);
