# E3dady

Arabic, RTL youth-service directory, shared Friday attendance, follow-up tasks, and service schedules. Built with Next.js 16.4.3, React, and Supabase.

## Run locally

Use Node.js 24 and npm:

```sh
npm ci
```

Copy `.env.example` to `.env.local` and supply your project's **public/anonymous** Supabase key and URL. Never place a service-role key in a `NEXT_PUBLIC_*` variable. The app shows a sign-in/configuration screen when disconnected; it does not expose a bundled operational directory or grant a default administrator.

Complete the database and account setup below, then run:

```sh
npm run dev
```

For production:

```sh
npm run build
npm start
```

The build also creates `public/precache-manifest.json`, checks client chunks for leaked fixture contact data, and prepares all versioned JavaScript/CSS for offline use. Deploy the generated public manifest with the `.next` build from the same run. System Arabic fonts avoid build-time Google Fonts downloads. Use HTTPS outside localhost.

## Database setup and upgrade

1. Back up an existing Supabase database and export any old browser-only work before rollout. Legacy browser caches are also archived locally by the upgraded app before being removed; an authenticated administrator can download that backup from the sync panel. They are never silently imported into cloud data.
2. In the Supabase SQL Editor, run **`supabase/migrations/20261028_security_and_reliability.sql` as the database owner**. This file supports both a fresh project and an existing installation, preserves operational rows, adds missing columns, replaces permissive policies, and removes the unsafe legacy RPCs. Local PostgreSQL tests cover both installation paths and reapplication.
3. If the application has already been deployed, run **`supabase/migrations/20261029_external_schedule_speakers.sql` as the database owner**. It adds `service_schedules.speaker_name`, which is required when a meeting speaker is external or is not in the church servant directory. The migration also asks PostgREST to reload its schema cache. If the error `Could not find the 'speaker_name' column of 'service_schedules' in the schema cache` appears, this migration has not yet been run against the same Supabase project used by `.env.local`.
4. Create the service's user accounts using the Supabase Authentication dashboard. Use confirmed email/password accounts; do not rely on signup metadata to assign roles. Disable public signup in your project if account creation is administrator-managed.
5. Link each Auth user to its existing servant record. Run the following as the database owner after replacing both UUIDs:

```sql
UPDATE public.servants
SET auth_user_id = 'AUTH-USER-UUID'
WHERE id = 'EXISTING-SERVANT-UUID' AND auth_user_id IS NULL;
```

For a fresh project, create the first linked administrator as the database owner:

```sql
INSERT INTO public.servants(name, phone, role, auth_user_id)
VALUES ('Administrator name', 'Administrator phone', 'admin', 'AUTH-USER-UUID');
```

Verify the intended rows were linked. The servant UUID and Auth UUID do not need to match. Adding a servant in the UI creates a directory record; creating/linking its Auth login remains an administrator provisioning step. There is no self-service role escalation or browser impersonation. Keep at least one linked administrator; the database prevents deleting/demoting the last one.

6. Check the Realtime publication for the application's tables if your project uses a custom publication configuration. The migration adds missing tables to `supabase_realtime` when that publication exists. A periodic refresh/reconnect path also works without realtime events.
7. Deploy the upgraded app after the migrations and account links are ready. An older anonymous-only client cannot write through the new policies. Have users reload to activate the new service worker.

Do **not** run `schema.sql` or `fix_permissions_and_seed.sql` as repair scripts: they are retired and now stop with an explanatory error. The older migrations are historical; a fresh SQL Editor installation can start directly with the standalone 20261028 migration. Do not reapply the historical open-permission migrations to an operational database.

`seed_real_data.sql` and `clear_attendance.sql` are destructive development tools, wrapped in a transaction and disabled unless the SQL session explicitly sets `e3dady.allow_destructive_seed = 'on'`. They are not part of deployment or recovery. Do not run them against production. The old unsafe SQL generator is retired.

## Authorization model

- Anonymous/unlinked users cannot read operational records or call mutation RPCs.
- Linked servants can read the shared directory, schedules, attendance, and follow-up history; add/edit directory records; and record shared Friday attendance during Friday–Sunday.
- Servants can record follow-up for their assigned youths. Administrators can record follow-up for any youth.
- Only administrators can manage servant roles, edit schedules, archive membership, or perform academic-year promotion.
- Archived attendance changes require an administrator, a recognized reason category, and at least three characters of explanation. Every attendance insertion/change/deletion stores actor, time, before/after values, and reason in `attendance_audit` in the same transaction.
- Direct attendance/log/task writes are denied. Transactions derive the actor from `auth.uid()` rather than accepting a browser-supplied servant identity.

The service intentionally has a shared directory. It is not a multi-tenant system and does not implement separate organizations or private sub-teams.

## Saves, drafts, and offline behavior

Attendance drafts are stored in account-scoped IndexedDB. Navigation and incoming updates do not erase them. Concurrent tabs update the draft atomically. Save moves the committed draft into an outbox in the **same local transaction**; only changed keys are submitted, and `status: null` explicitly deletes a saved mark.

Attendance and follow-up operations have persistent UUIDs. They survive reloads, retry on reconnect/resume, and are idempotent at the database boundary. The UI distinguishes a durable pending operation from server-confirmed success. A storage error is reported rather than acknowledged as a durable offline save.

Every attendance change carries the row version originally edited. A concurrent edit rejects the entire batch; it never silently overwrites the other person's change. A blocked operation remains visible in the sync panel until explicitly canceled. Reload the latest session and re-enter the intended correction, with an administrative reason if the grace period has ended. Automatically retrying cannot bypass an expired grace period or a revoked permission.

Directory, servant, and schedule CRUD require an online server confirmation and leave the form open on failure. They are not silently queued. Sign-out requires drafts and pending operations to be resolved first; confirmed sign-out clears the user's cached snapshot and drafts.

Offline access requires a previous successful sign-in and cached data on that device. It cannot establish a new account session without an internet connection. Older, uncached sessions require connectivity before editing. The service worker caches the public shell/assets only, retains the previous complete build during upgrades, and never caches private API responses. Private cache data remains on the signed-in device; use trusted devices and sign out when done.

## Attendance and follow-up rules

- Business dates use `Africa/Cairo`, independent of the browser timezone. Day/week state refreshes on resume and periodically while open.
- Meetings are Fridays. Attendance can be changed normally on Friday, Saturday, and Sunday; from Monday it requires the archived-edit workflow. Future sessions are read-only.
- Initial data includes complete, paginated attendance for the current academic year plus at least the latest 12 Fridays. Opening an older Friday loads its complete 12-week window. Directory percentages refer to recorded sessions in the current academic year, not lifetime attendance.
- Risk classification uses a fixed 12-Friday window ending at its reference date. Unknown and excused sessions break absence streaks. Fading-regular classification requires a complete six-Friday recent window and six historical recorded Fridays. Streak counts are limited to that 12-Friday analysis window. Missing rows remain unknown; they are not converted into absences.
- The calendar covers September through August. Meeting turnout uses present divided by eligible membership, consistently across the roster, calendar, and copied summary. Unknown legacy joining dates stay unknown rather than being inferred from import timestamps.
- Youth archive preserves history and sets a departure date. Known joining/departure dates determine historical roster membership. Grade history is captured per academic year; years without a captured grade are labelled unrecorded rather than invented.
- At the September transition, administrators can use the annual promotion action. Only continuing youths without an entry for the current year are advanced; third-year youths are archived. The transaction is idempotent and preserves prior-year grades. The initial migration records the existing current-year roster and does not retroactively promote it.
- A daily follow-up task is persisted per servant and Cairo date. Completion does not select another person on the same day. Contact timestamps, outcomes, logs, and task completion are one transaction. Offline contact requests older than 90 days or more than five minutes in the future are rejected for manual review.

The notification dialog sends manual local test notifications only. Scheduled/closed-app push delivery is not configured, and adding an environment variable does not enable it.

## Engineering checks

```sh
npm run typecheck
npm run lint
npm test
npm run benchmark
npm run build
```

Tests use Node's test runner, fake IndexedDB, and PGlite's local PostgreSQL engine. They never connect to the deployed Supabase database. CI runs typecheck, lint, tests, and a production build. The benchmark measures application calculations with synthetic data; it is not a mobile rendering or production network benchmark.

`src/types/supabase.ts` describes the migration's public API and types the Supabase client. After applying schema changes, compare it with types generated from the actual project using `supabase gen types typescript --project-id YOUR_PROJECT_ID`; update table/RPC shapes and their tests together. Never paste a service-role key into source control or browser code.

Before production rollout, test real Supabase Auth provisioning, RLS and Realtime delivery in a staging project, two devices editing the same/different rows, offline reconnect after the grace period, and service-worker upgrades on representative phones. Embedded database and worker tests cover application logic but do not verify your hosted project configuration.

See [implementation notes](IMPLEMENTATION_NOTES.md) for the changes and [original review](PROJECT_REVIEW.md) for the baseline findings.
