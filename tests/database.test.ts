import { it, expect } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
it('migrations enforce relationships and preserve history on source updates', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync('migrations/0001_initial.sql', 'utf8'));
  db.exec(
    "INSERT INTO users(id,name) VALUES ('u','Learner');INSERT INTO courses VALUES('html','HTML','https://web.dev/learn/html','',0,0,'published');INSERT INTO lessons VALUES('html/one','html','One','https://web.dev/learn/html/one',0,'','published','h',1,'now',NULL,'1','[]','');INSERT INTO lesson_progress(user_id,lesson_id,status) VALUES('u','html/one','completed');UPDATE lessons SET status='unavailable',hash='changed' WHERE id='html/one';",
  );
  expect(db.prepare('SELECT status FROM lesson_progress').get()?.status).toBe(
    'completed',
  );
  expect(() =>
    db.exec(
      "INSERT INTO lesson_progress(user_id,lesson_id) VALUES('missing','html/one')",
    ),
  ).toThrow();
  db.close();
});
