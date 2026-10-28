# Implementation follow-up

Implemented against the review baseline `a00a0df`. The original report remains a record of that baseline; its source line numbers may have moved after refactoring.

## What changed

- **F01–F02: identity and privacy.** Added Supabase email/password sign-in, removed servant impersonation and default admin state, removed fixtures from the client data flow, and added a build check for fixture contacts in public chunks. A standalone migration revokes anonymous table/routine access, replaces permissive policies, derives actors from Auth, removes unsafe legacy RPCs/signup metadata trust, protects privileged columns, and enforces the last-administrator invariant.
- **F03–F05: truthful persistence.** Mutations inspect database results. Online CRUD changes appear only after server confirmation. Attendance/contact operations use account-scoped IndexedDB, operation IDs, durable retry, and server deduplication. Moving a draft into the outbox is atomic. The state-updater persistence side channel and full-array broadcasts were removed. Legacy browser work is backed up before cache retirement.
- **F06–F07 and F16: attendance editing.** Persistent per-session drafts survive navigation and realtime updates. Dirty rows keep their original server versions. Saves send deltas, explicitly represent deletion, and reject conflicts transactionally. The global wipe was removed from the app. Forms retain their input on failure and prevent duplicate submissions; removing a current servant is protected in the database.
- **F08–F09 and F14/F18: complete, consistent analysis.** Complete pagination replaces the global 500-row cap. Fetching is scoped to useful date ranges; historical selections load a complete 12-Friday window. Indexed lookups and shared labels replace repeated global scans/formatter creation. Analytics exclude future records, use fixed calendar windows, break streaks on unknown/excused sessions, and use Cairo dates. Calendar coverage extends through August. Turnout denominators are consistent.
- **F10: enforcement and auditing.** Archived changes require an authenticated administrator and a written reason. Every attendance change includes actor and before/after values in the same transaction. Display and server lifecycle rules agree; future attendance is not editable.
- **F11–F13: follow-up consistency.** One transaction records the contact timestamp, method, outcome, log, and daily completion. The missing outcome column is migrated explicitly. Daily tasks are persisted rather than reranked after completion. Outcome forms are recreated for the selected youth/method; persisted and pending outcomes can be displayed after reload.
- **F15–F17: lifecycle and operations.** Empty server results remain empty. Account changes clear in-memory data. Youth archive retains history; membership dates and per-year school years support historical rosters and idempotent annual promotion. New provisioning is non-destructive; legacy repair/generator scripts stop rather than reseed a database. Development-only destructive scripts require an explicit opt-in.
- **F19: notifications.** The UI now describes its implemented manual test capability. Unsupported OneSignal/scheduled-delivery promises were removed.
- **B01–B05: performance.** Added attendance indexes in memory, cached sparkline calculations/shared date labels, memoized roster rows, selective store subscriptions, coalesced realtime refreshes, scoped/paginated queries, and lazy tab/dialog imports. IndexedDB replaces synchronous full-dataset localStorage rewrites. Database RPCs now serve actual transactional workflows. Existing database indexes were not speculatively removed without deployed query plans.
- **Release quality.** Upgraded Next.js and matching lint configuration to 16.4.3, updated compatible vulnerable transitive dependencies, removed build-time Google Fonts downloads, added production offline asset preparation and private-bundle checks, improved dialog keyboard focus handling, restored browser zoom, fixed lint violations, and added CI.

## Evidence

The test suite includes business-date/risk rules, draft isolation, account-scoped outbox retry, IndexedDB transaction rollback, concurrent draft updates, store reload/reconnect behavior, complete pagination, and service-worker deployment/offline behavior. The actual SQL migration is executed against local PostgreSQL to test fresh installs, legacy upgrades, policy tightening, authorization, escalation prevention, idempotency, conflict rollback, deletion audits, atomic contact logging, stable daily tasks, schedule constraints, and annual promotion.

The final representative 500-person / 18,000-row calculation pass measured **55.17 ms cold and 29.11–29.85 ms on repeat passes** in this environment, compared with **1,247.8–1,443.4 ms** in the original review. This includes calculation work only and is not a browser or production latency guarantee. Re-run `npm run benchmark` to reproduce the current implementation's measurements.

Final verification:

- TypeScript and ESLint passed. A local Node heap cap was used for these checks after the restricted process hit memory limits.
- All **42 tests passed**, including execution of the migration on local PostgreSQL. The suite was run outside the restricted process after its embedded engine encountered an allocation limit.
- The Next.js 16.4.3 production build passed, generated 20 versioned script/style assets, and passed the fixture-contact privacy check.
- A local production-server HTTP smoke check passed: Arabic/RTL markup, security/cache headers, service worker, and all 24 precache resources returned the expected responses. The temporary server was stopped after testing.
- The final dependency audit reported **zero vulnerabilities** for the locked dependency versions.
- A browser automation surface was unavailable in this environment, so visual interaction and authenticated hosted-Supabase end-to-end testing remain staging checks rather than claimed completed verification.

## Deployment boundary

The migration has **not** been applied to the live Supabase project. Hosted Auth account links, deployed grants/publications, and real multi-device delivery must be verified in that project. Follow the [database setup steps](README.md#database-setup-and-upgrade) before deploying this frontend. The upgraded app fails closed when the required schema or linked account is missing.

The deployed database's query plans and index usage have not been measured. Existing overlapping indexes should be reviewed with staging/production statistics rather than removed based on source inspection. Closed-app push delivery remains intentionally unconfigured. Previously distributed fixture data cannot be recalled from devices by a source-code change; old caches and releases need operational review if those fixtures contained real contacts.
