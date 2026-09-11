import { error } from '@sveltejs/kit';
import { db, requireUser } from '$lib/server/db';
export const load = async ({ locals, platform }) => {
  const user = requireUser(locals);
  if (
    !platform?.env.OWNER_GITHUB_ID ||
    user.id !== platform.env.OWNER_GITHUB_ID
  )
    error(403, 'هذه الصفحة متاحة لصاحب الموقع فقط');
  const database = db(platform);
  const [runs, questions, versions] = await Promise.all([
    database
      .prepare('SELECT * FROM sync_runs ORDER BY created_at DESC LIMIT 10')
      .all<{ id: string; created_at: string; report: string }>(),
    database
      .prepare(
        "SELECT id,lesson_id FROM questions WHERE status='needs-review' LIMIT 100",
      )
      .all<{ id: string; lesson_id: string }>(),
    database
      .prepare(
        'SELECT lesson_id,version,imported_at FROM source_versions ORDER BY imported_at DESC LIMIT 50',
      )
      .all<{ lesson_id: string; version: number; imported_at: string }>(),
  ]);
  return {
    runs: runs.results,
    questions: questions.results,
    versions: versions.results,
  };
};
