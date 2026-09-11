# Learn Lab

A Svelte 5 / SvelteKit learning workspace for the live web.dev Learn curriculum, deployed as a Cloudflare Worker with D1 persistence. All 12 discovered courses are included, including **Learn AI** at position 12 in the recommended path. The source order is stored independently.

## Run locally

Requires Node 24 and npm. No Cloudflare account is required for local D1.

```sh
npm ci
npm run db:migrate
npm run db:import
npm run dev
```

The committed `data/curriculum.json` is a real normalized import, not sample curriculum. `reports/discovery.md` lists every discovered course and lesson URL. `.wrangler/` holds local data and must not be committed.

To enable real sign-in, create a GitHub OAuth app with callback `http://localhost:5173/auth/github/callback`. Copy `.env.example` to `.dev.vars`, fill the GitHub client ID and secret, and restart the server. Use the same hostname for the start and callback. Set `OWNER_GITHUB_ID` to your numeric GitHub user ID for `/admin`. No development login bypass is shipped. Public reading works before OAuth is configured; saving requires sign-in.

## What works

- Live-discovered courses and nested lesson paths; source order and configurable global order.
- Structured sections, text, links, code, lists, tables, images, callouts, source examples, and source quizzes.
- Dashboard, course pages, full lesson reader, automatic reading-position saves, completion, attempts, real statistics, and mistake review.
- Source MCQ/multi-select grading, grounded cloze generation, short answers, true/false, prediction, bug identification, ordering and matching; HTML code answers use structural DOM validation, never code-string equality.
- A manually validated HTML challenge, plus HTML/CSS preview and JavaScript console playground. CodeMirror is dynamically loaded. JavaScript runs in a worker inside an opaque sandbox iframe with network-blocking CSP and a time limit. HTML/CSS preview allows no scripts or external resources.
- Course mastery checks sample up to 12 validated questions, record every answer, and require 80% to pass. Course lesson completion remains separate from the mastery check.
- GitHub OAuth with state validation, hashed session tokens, HttpOnly/SameSite cookies, HTTPS secure cookies, origin checks, server-authoritative scoring, and owner-only health reports.
- Responsive light/dark UI, keyboard navigation, source attribution, private noindex responses, and curriculum content search.

## Ingestion and maintenance

```sh
npm run curriculum:discover             # discover courses and ordered lesson links
npm run curriculum:crawl                # cache source HTML only
npm run curriculum:parse                # normalize cached pages; no source requests
npm run curriculum:sync                 # crawl/cache, parse, validate, publish local JSON
npm run curriculum:sync -- --refresh    # refresh every page conservatively
npm run curriculum:validate
npm run questions:generate              # draft candidates, not automatically published
npm run questions:validate
npm run db:prepare                      # validated SQL artifact
npm run db:import                       # apply artifact to LOCAL D1
```

Discovery requires `data/robots.txt`; its committed copy allows Learn crawling. Fetches use one request at a time, a 1.2-second minimum delay, timeouts, and four attempts. English is explicitly requested and validated. A missing English cache entry is re-fetched. Raw HTML is tooling-only and ignored by Git. The worker never crawls source pages.

An import aborts on fetch/parser/validation failures and leaves the last good normalized dataset in place. The report is written to `reports/sync.json`. Lessons without an Arabic translation on web.dev are imported from the English source instead and listed in `englishFallbacks`; their content is fully structured and they stay visible. Content hashes exclude timestamps; unchanged source revisions are retained. Exercises whose source changes are marked for review before new validated exercises are inserted. Removed lessons are retained as unavailable, including their progress and attempts. Source snapshots are compressed normalized JSON (`gzip-base64:` prefix) in `source_versions`; the unique identity is `(lesson_id, hash)`. Database revision numbers increment from the current D1 state, independently of a checkout's revision counter.

Generated published cloze activities are exact quotations with a single known missing term. They are checked deterministically against the source, not inferred from an LLM. Broader draft generation remains a review workflow. Third-party embedded demos open on their source sites. Final web.dev quiz pages sometimes withhold answer keys; their questions are stored as needing review and source grading is linked. The app does not fabricate those answer keys or claim source quiz certification.

`data/learning-order.json` controls the recommended path. Unknown courses stay visible with a null position and a review notice. Coming-soon pages are visible but excluded from published completion. A lesson without validated questions is explicitly a reading-completion checkpoint, not a passed assessment.

## Deploy to Cloudflare Workers

```sh
npx wrangler login
npx wrangler d1 create learn-lab
# Replace the all-zero database_id in wrangler.jsonc with the returned ID.
# Set GITHUB_CLIENT_ID and OWNER_GITHUB_ID in wrangler.jsonc.
npx wrangler secret put GITHUB_CLIENT_SECRET
npm run db:types
npx wrangler d1 migrations apply learn-lab --remote
npm run db:prepare
npx wrangler d1 execute learn-lab --remote --file data/import.sql
npm run deploy
```

Register the production callback `https://YOUR-WORKER-HOST/auth/github/callback` in a separate GitHub OAuth app. Use a separate Worker, D1 database, and OAuth app for staging. The placeholder database ID is deliberately not a provisioned resource. Production deployment and a real GitHub login require your account configuration; local automated tests cannot attest those external credentials.

Before a production content import, take a D1 export (`wrangler d1 export learn-lab --remote --output backup.sql`) and use a maintenance window. The validated SQL is idempotent, but a multi-statement file import is not an atomic curriculum-wide swap. Individual learner mutations use D1 batches. Large source snapshots are compressed to remain below D1 statement limits; oversized statements are rejected before export.

## GitHub Actions

`ci.yml` checks types, formatting, parsers, scoring, migrations, build, and Playwright flows. `curriculum-sync.yml` runs weekly and manually; it crawls, validates, and uploads a reviewable artifact. Only a manual run can promote to production, using the `curriculum-production` environment. Configure required reviewers for that environment and provide `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets. Commit updated normalized data after accepting a sync so the repository remains reproducible. Scheduled runs never blindly deploy new content.

## Verification

```sh
npm run check
npm run lint
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

E2E tests use a local D1-only fixture session; OAuth exchange and state handling are separately unit tested with mocked GitHub responses. No test-auth route exists. For a preinstalled Chromium, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to its absolute executable path. Fixtures in `tests/fixtures` prevent parser tests from crawling production.

## Boundaries

This implementation supports all requested exercise shapes, but it does not contain a hand-authored challenge of every type for every lesson. Published automated enrichment is conservative recall practice; deeper debugging and browser behavior challenges need editorial authoring. Automated saved code grading currently supports structural HTML DOM tasks. The JS playground executes isolated code, but it does not claim to provide a server-trusted arbitrary-JavaScript grading service. Search currently uses indexed course/lesson relationships and bounded SQL text matching; add FTS only if measured scale requires it.

The source curriculum includes copyrighted educational material. See `/about` for CC BY 4.0 text/media attribution, Apache 2.0 code attribution, source links, and third-party exceptions. This is an independent project, not an official Google product.
