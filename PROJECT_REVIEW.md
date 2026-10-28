**E3dady — engineering review and bottleneck report**

Implementation follow-up: see [IMPLEMENTATION_NOTES.md](IMPLEMENTATION_NOTES.md) and [README.md](README.md). This report describes the original review baseline; refactoring has moved some source line numbers.

Reviewed on 28 October 2026. Source baseline: commit `a00a0df`, initially clean working tree. No application code, database records, or permissions were changed during this review.

**Engineering assessment**

I would not approve the current implementation for production use with real youth contact information. The largest risks are unauthorized database access, loss of offline edits, misleading save confirmations, and incorrect attendance analysis. These are more urgent than infrastructure capacity.

The project has a workable prototype structure: Next.js 16.3.6 and React 19.2.8 provide the UI, a shared React context holds application state, Supabase supplies persistence and attendance change events, and localStorage plus a service worker provide parts of an offline experience. The shipped local dataset contains 7 servants, 42 youths, 3 schedules, and no attendance records.

The central architectural problem is that browser state simultaneously acts as identity, database cache, editable draft, analytics input, and offline storage. Those responsibilities need different guarantees. Currently, a local change can look authoritative without being durable, and a remote change can overwrite a local draft.

Severity meanings: **P0** blocks release with real data; **P1** can lose, corrupt, or materially misrepresent operational data; **P2** affects reliability, scalability, or important workflows; **P3** is a smaller quality or maintenance concern. Findings below distinguish local reproduction, source inspection, and deployment-dependent exposure.

**Verification and limits**

- `npx tsc --noEmit`: passed.
- `npm run lint`: failed. A subsequent structured ESLint run counted **16 errors and 14 warnings across 10 files**. Errors include synchronous state changes inside effects, unescaped JSX quotes, explicit `any`, and CommonJS imports rejected by the configured rules. A lint rule violation alone is not proof of a runtime defect.
- `npm run build`: failed because this environment could not download Cairo and Tajawal from Google Fonts. Production compilation was therefore not fully verified; this failure is not evidence of an application TypeScript error.
- Executed the actual TypeScript analytics, rotation, calendar, and fixture modules locally through TypeScript transpilation. Synthetic data reproduced reference-date leakage, excused-absence misclassification, same-day candidate rotation, Cairo midnight misclassification, and incomplete academic-calendar coverage.
- Executed the actual `AppProvider` with mocked database responses and a deliberately deferred React state scheduler. This reproduced swallowed mutation errors and the empty immediate attendance cache/broadcast described below. This is a controlled scheduler reproduction, not a browser integration test.
- Inspected all application areas, schema/seed/migration scripts, service-worker caching, and installed Next.js guidance on client/server components and data security. No repository tests or CI workflow were found in the available files.
- Did not query or mutate the deployed Supabase project. Its applied migrations, grants, RLS policies, realtime publication, row counts, query plans, and production traffic remain unverified. No production load test or mobile-browser profile was performed. No secret values are included in this report.

**Release-blocking access and privacy findings**

**F01 — P0: The application has no trusted user identity, and the supplied SQL allows anonymous writes.**

Evidence: [identity switching](<D:/VS Projects/E3dady/src/context/AppContext.tsx:358>), [admin derivation](<D:/VS Projects/E3dady/src/context/AppContext.tsx:785>), [UI instruction to switch to an admin](<D:/VS Projects/E3dady/src/components/ServantsManager.tsx:119>), [anonymous policies](<D:/VS Projects/E3dady/supabase/migrations/20260927_followup_and_attendance.sql:78>), and [broad grants and policies](<D:/VS Projects/E3dady/supabase/fix_permissions_and_seed.sql:13>).

Selecting a servant sets a browser object; it does not authenticate a Supabase user. The initial selected servant is also taken from the bundled data. Anyone can select an administrator in the normal UI. The migration creates `FOR ALL TO authenticated, anon USING (true) WITH CHECK (true)` policies for servants, youth, attendance, and follow-up logs. The permissions-fix script additionally grants all table/routine privileges and applies unrestricted policies to all five business tables.

If those scripts are deployed as written, anonymous API clients can read contact information, alter roles and assignments, falsify attendance, and delete records. The public anonymous key is expected to be public; database authorization is the missing protection.

Hardening only the UI or selected policies will not fully resolve this. The `SECURITY DEFINER` RPCs accept arbitrary youth/servant identifiers without validating the authenticated caller. The base schema also lets users update their own servant row, including its role, and copies a role from signup metadata in `handle_new_user`. These paths must be addressed together.

Remedy: authenticate users, map each account to a servant, derive identity from the session, define allowed operations explicitly, restrict anonymous grants, prevent self-editing privileged fields, and validate callers inside privileged functions. Test both ordinary REST access and RPC access with anonymous, servant, and administrator credentials. Deployed exploitability requires a read-only audit of actual database permissions; the repository configuration is already sufficient to block a release decision.

**F02 — P1, conditional privacy impact: Contact records are bundled into publicly downloadable application JavaScript.**

Evidence: [static fixture import](<D:/VS Projects/E3dady/src/context/AppContext.tsx:5>) and [fixture data](<D:/VS Projects/E3dady/src/lib/mockData.ts:48>).

The browser imports and uses a directory of 42 youths and 7 servants as its initial/fallback state. Any real names, phone numbers, or notes in that module are delivered with the client application, independently of database RLS. The SQL files describe real-data seeding, but I did not verify whether every fixture value is real. If any are real, this is a release-blocking disclosure.

Remedy: keep only clearly synthetic fixtures in production bundles. Load the operational directory after authorization. Review cached releases if real records have already shipped.

**High-impact logic and data-integrity findings**

**F03 — P1: Most database failures are silently treated as successful local operations.**

Evidence: [youth CRUD](<D:/VS Projects/E3dady/src/context/AppContext.tsx:448>), [schedule CRUD](<D:/VS Projects/E3dady/src/context/AppContext.tsx:617>), [servant CRUD](<D:/VS Projects/E3dady/src/context/AppContext.tsx:668>), and [contact logging](<D:/VS Projects/E3dady/src/context/AppContext.tsx:421>).

Most calls only use `try/catch` and never inspect the returned `error`. Ordinary Supabase query failures are returned in a result object, as shown in the [official query error-handling documentation](https://supabase.com/docs/reference/javascript/select). Optimistic changes remain visible and forms close even when the database rejects them. Attendance does inspect its error, but still returns `success: true`; the UI also treats its exception path as a successful local save.

Reproduction: a mocked database permission error caused `updateYouth` to resolve without rejecting. `saveAttendance` returned `{ success: true, cloudSynced: false, count: 1, error: 'Synthetic permission failure' }`.

Remedy: use a shared typed mutation result; inspect every response; distinguish confirmed, pending, and failed writes; roll back rejected operations or retain an explicit retryable pending operation. Close forms and show success only for the documented durability level. Configuration presence must not be displayed as verified connectivity: [Header](<D:/VS Projects/E3dady/src/components/Header.tsx:71>) currently does that.

**F04 — P1: Offline automatic synchronization is promised but not implemented.**

Evidence: [offline toast promise](<D:/VS Projects/E3dady/src/components/SharedAttendanceTable.tsx:383>), [mount-only remote fetch](<D:/VS Projects/E3dady/src/context/AppContext.tsx:225>), and [single save attempt](<D:/VS Projects/E3dady/src/context/AppContext.tsx:549>).

No durable operation queue, retry loop, reconnect handler, or pending-write reconciliation exists. A failed write can remain only in localStorage. On the next online mount, fetched attendance replaces that local state, losing the offline change. The same general problem affects youth, servants, schedules, and follow-up actions.

Remedy: persist a mutation outbox, preferably in IndexedDB, before acknowledging durable offline saves. Replay idempotently, reconcile before replacing cached snapshots, and expose pending/failed counts. Until then, remove the automatic-sync claim.

**F05 — P1: Attendance persistence depends on a state updater running synchronously.**

Evidence: [saveAttendance](<D:/VS Projects/E3dady/src/context/AppContext.tsx:500>).

`latestAttendanceList` starts as `[]` and is assigned inside `setAttendance(prev => ...)`. Immediately after scheduling the update, the function serializes and broadcasts that variable. React can defer the updater, leaving it empty at the point of persistence. Other tabs can consequently receive an empty attendance snapshot. A later persistence effect may repair this tab's cache, but the immediate safety guarantee is false and cross-tab updates can race.

Reproduction: with deferred scheduling, the immediate persisted list and broadcast list were both `[]`, while eventual React state contained the saved record.

Remedy: do not communicate results out of a queued updater through a mutable local variable. Use a consistent reducer/store plus a persistence boundary, or persist a validated mutation independently. Broadcast mutations or versioned confirmed snapshots.

**F06 — P1: Incoming changes discard unsaved attendance edits; saves also submit unchanged rows.**

Evidence: [draft replacement effect](<D:/VS Projects/E3dady/src/components/SharedAttendanceTable.tsx:119>), [full draft save](<D:/VS Projects/E3dady/src/components/SharedAttendanceTable.tsx:355>), and [realtime state updates](<D:/VS Projects/E3dady/src/context/AppContext.tsx:311>).

Every attendance or youth change rebuilds `localStatuses` from central state. An event for another student, even another session, can erase the user's current unsaved marks. Whole-array tab broadcasts have the same effect. Saving submits every recorded entry, including unchanged ones, increasing write traffic and the opportunity for a stale snapshot to overwrite another user's work. This also changes `recorded_by` on rows the current user did not actually edit.

Remedy: track a base snapshot and per-row dirty operations. Merge remote updates into untouched rows, detect conflicts on dirty rows, save only changes, and use a revision/updated-at condition for concurrent modification. Test two browsers editing different rows and the same row.

**F07 — P1: Clearing attendance in the roster does not clear saved attendance.**

Evidence: [clearFiltered](<D:/VS Projects/E3dady/src/components/SharedAttendanceTable.tsx:239>) and [upsert-only persistence](<D:/VS Projects/E3dady/src/context/AppContext.tsx:558>).

Clear removes keys from `localStatuses`. Save serializes only remaining keys and upserts them. Omitted records are never deleted, so cleared entries return after refresh or another state sync. The global clear operation is a different, much broader operation and is not a valid substitute.

Remedy: represent deletion explicitly, for example as a separate deleted-key list, and apply updates/deletions transactionally with session-scoped authorization.

**F08 — P1: The 500-row attendance cap makes history and analytics silently incomplete.**

Evidence: [attendance query](<D:/VS Projects/E3dady/src/context/AppContext.tsx:237>).

The newest 500 rows across all youths become the entire attendance model. At 42 youths, 12 complete sessions require 504 rows; at 100 youths, the cap covers only 5 full sessions; at 200, it covers 2 full sessions plus a partial session. At a same-date cutoff, the sort has no secondary key, so the partially retained roster is not deterministically defined.

Older dates appear unrecorded even when the database has records. Attendance rates, streaks, newcomer detection, and fading-regular detection all operate on a truncated sample. For example, with at most five records per person after a 100-person complete-session import, the rule requiring six sessions cannot identify fading regulars.

Remedy: fetch a complete selected-session roster, retrieve bounded but complete per-youth history windows, calculate lifetime aggregates separately, and paginate explicitly with stable ordering. Do not simply remove the cap and indefinitely download all history.

**F09 — P1: Risk evaluation ignores its reference date and uses inconsistent streak semantics.**

Evidence: [triage computation](<D:/VS Projects/E3dady/src/lib/pastoralAnalytics.ts:301>), [different streak computation](<D:/VS Projects/E3dady/src/context/AppContext.tsx:726>), and [sparkline gap handling](<D:/VS Projects/E3dady/src/lib/pastoralAnalytics.ts:241>).

`evaluateYouthPastoralRisk` uses the supplied reference date for newcomer age, but does not exclude attendance after it. A historical view can therefore classify a person using future records. It skips excused records when counting consecutive absences, whereas `getYouthWithDetails` stops at any non-absent status. Missing Fridays are also skipped rather than represented in a complete session sequence. The code labels the last six recorded rows as the recent six weeks, which is incorrect when recording is sparse.

Reproduction: with reference date 16 October and a present record that day, three later absences produced `critical_dropout` and three consecutive absences. A latest excused record followed by three older absences also produced `critical_dropout` with a streak of three; the context helper would report zero for the same latest record.

Remedy: establish one definition of eligible/completed sessions, reference cutoff, excused treatment, and unknown recording gaps. Compute every screen's streak and risk from that shared model. Confirm the business policy for excused and unknown sessions before choosing a particular interpretation.

**F10 — P1: Historical edit auditing is only a success message; the lifecycle lock is inconsistent.**

Evidence: [audit save](<D:/VS Projects/E3dady/src/components/SharedAttendanceTable.tsx:355>), [historical-date check](<D:/VS Projects/E3dady/src/components/SharedAttendanceTable.tsx:98>), and [session lifecycle](<D:/VS Projects/E3dady/src/lib/fridayCalendar.ts:30>).

The audit reason is never persisted. `_auditNotes` is unused, and `auditCategory` only chooses a success toast, even if cloud synchronization failed. There is no corresponding database audit model in the repository.

Separately, the last Friday is explicitly exempted from editing lock checks. On Monday 26 October, the 23 October session is labelled locked by the lifecycle function while ordinary servants can still edit it. Upcoming dates are also editable without an explicit lifecycle policy. All enforcement remains in the browser.

Remedy: authorize archived-session changes at the database boundary and write actor, timestamp, before/after values, category, and reason in the same transaction. Derive display and enforcement from one lifecycle rule.

**F11 — P1: Follow-up timestamps, outcomes, and logs can diverge.**

Evidence: [parallel contact writes](<D:/VS Projects/E3dady/src/context/AppContext.tsx:418>), [migration table definition](<D:/VS Projects/E3dady/supabase/migrations/20260927_followup_and_attendance.sql:53>), and [alternative table definition](<D:/VS Projects/E3dady/supabase/fix_permissions_and_seed.sql:63>).

The app updates `last_contacted_at` and inserts a log as two independent requests. One can succeed while the other fails. Errors are ignored, and optimistic state suppresses follow-up as though contact had been recorded. The normal migration omits `outcome`, although the UI sends it. The permissions-fix file includes it only inside `CREATE TABLE IF NOT EXISTS`, which does not add the column to an existing table.

The app never fetches cloud follow-up logs and only subscribes to attendance changes. Other devices do not receive youth contact timestamps or outcomes through the current application subscription. Local logs are capped at 100 and are not a durable shared history.

Remedy: add a forward migration for the missing column and constraints. Use one authenticated, idempotent transaction for contact timestamp and log, then invalidate/refresh or subscribe to the relevant data. The existing contact RPC is a starting point, but needs authorization and outcome support before use.

**Additional workflow and reliability findings**

**F12 — P2: The one-person daily task changes immediately after completion.**

Evidence: [selection recomputation](<D:/VS Projects/E3dady/src/context/AppContext.tsx:375>), [contact-based ordering](<D:/VS Projects/E3dady/src/lib/followUpRotation.ts:152>), and [promise of tomorrow's rotation](<D:/VS Projects/E3dady/src/components/DailySingleFollowUpCard.tsx:199>).

Updating the selected person's timestamp reorders the candidate pool immediately. A local reproduction selected `y1`, then selected `y2` after marking `y1` contacted on the same day. With multiple eligible people, the completion banner can disappear and the UI presents another task, despite promising that the person changes tomorrow.

Remedy: persist the assigned daily task by servant and service date, track its completion separately, and expose additional optional contacts deliberately. A deterministic tie-breaker does not freeze a task when its ranking inputs change.

**F13 — P2: Contact modal state can record the wrong method or reuse another contact's notes.**

Evidence: [modal state initialization](<D:/VS Projects/E3dady/src/components/PastoralOutcomeModal.tsx:25>) and [persistent modal instance](<D:/VS Projects/E3dady/src/components/DailySingleFollowUpCard.tsx:276>).

The modal stays mounted while closed. `method` is initialized from `initialMethod` once, initially `call`; choosing WhatsApp later changes the prop without resetting the state. Outcome and notes also survive closing/reopening and candidate changes. The card's `loggedOutcome` similarly is not tied to a youth identifier.

Remedy: initialize a fresh draft when opening for a specific youth/method, or key/remount an appropriate form boundary. Store completed outcomes by log or task identity. Verify WhatsApp-first opening, reopening, and switching servant/candidate.

**F14 — P2: Contact dates mix UTC with Cairo calendar dates, and date-sensitive state never rolls over.**

Evidence: [UTC contact date](<D:/VS Projects/E3dady/src/context/AppContext.tsx:388>), [string-based today check](<D:/VS Projects/E3dady/src/lib/followUpRotation.ts:93>), [noon date parser](<D:/VS Projects/E3dady/src/lib/utils.ts:26>), and [frozen Friday dates](<D:/VS Projects/E3dady/src/context/AppContext.tsx:90>).

Reproduction: `2026-10-27T22:30:00Z` is 01:30 on 28 October in Cairo, but the selector says it was not contacted today. `contact_date` also receives the UTC date. The last-Friday threshold is local noon, so a Friday morning contact is treated as before that Friday. Friday references and several lifecycle calculations are memoized without a changing date dependency; an app left open across midnight or a week boundary remains stale.

Remedy: define the service timezone, compare dates in that timezone, use explicit day/session boundaries, and refresh the reference clock on day change and app resume. Preserve timestamps in UTC while deriving business dates consistently.

**F15 — P2: An empty database can appear populated with stale or demo records.**

Evidence: [non-empty-only local restoration](<D:/VS Projects/E3dady/src/context/AppContext.tsx:142>), [remote result guards](<D:/VS Projects/E3dady/src/context/AppContext.tsx:248>), and [version reset](<D:/VS Projects/E3dady/src/context/AppContext.tsx:98>).

Valid empty remote results for youth, servants, and schedules are ignored. Empty local youth/schedules can restore bundled fixtures. Thus, deleting the last real record or intentionally starting an empty deployment leaves phantom data. A cache-version change deletes local state before any pending-write reconciliation. Initial background fetches can also replace edits made while that fetch was in flight.

Remedy: distinguish loading, error, empty, demo, and authenticated operational states. Accept empty successful results. Make demo mode explicit, version cached schemas without discarding unsynchronized operations, and reconcile snapshots with mutations that occurred after the request started.

**F16 — P2: Navigation silently discards drafts; removing a servant leaves stale references locally.**

Evidence: [tab remount](<D:/VS Projects/E3dady/src/app/page.tsx:64>), [date replacement](<D:/VS Projects/E3dady/src/components/SharedAttendanceTable.tsx:119>), and [servant deletion](<D:/VS Projects/E3dady/src/context/AppContext.tsx:704>).

Switching tabs unmounts the attendance editor, and selecting another date replaces its draft. Neither path saves the draft or warns about dirty edits. Deleting the current servant does not clear `currentServant`; local schedules also retain the removed speaker reference. Subsequent saves can attribute work to a deleted servant and fail foreign-key checks. The UI protects the last servant, but does not protect the last administrator role.

Remedy: persist drafts by session or require an explicit save/discard decision when leaving dirty work. Reconcile active identity and all affected relations after confirmed deletion. Enforce administrator invariants on the server.

**F17 — P1 when run against operational data: Provisioning and repair scripts are destructive and do not form a reliable upgrade path.**

Evidence: [base schema truncation](<D:/VS Projects/E3dady/supabase/schema.sql:227>), [permissions repair truncation](<D:/VS Projects/E3dady/supabase/fix_permissions_and_seed.sql:137>), [real-data seed truncation](<D:/VS Projects/E3dady/supabase/seed_real_data.sql:7>), and [RPC date expression](<D:/VS Projects/E3dady/supabase/migrations/20260927_followup_and_attendance.sql:129>).

The file labelled a permissions fix deletes operational tables as part of reseeding. Base schema and seeding are also combined. Following the UI's instruction to execute `schema.sql` after any sync failure risks erasing attendance and directory changes. Different setup paths produce different schemas, especially for `outcome`.

The unused daily-selector RPC also contains `p_target_date - (v_diff * INTERVAL '1 day')::DATE`, which attempts to cast an interval to a date. This should instead use date-minus-integer arithmetic, such as `p_target_date - v_diff`; see the [PostgreSQL date operator documentation](https://www.postgresql.org/docs/17/functions-datetime.html). This SQL issue was identified by inspection, not execution against PostgreSQL.

Remedy: separate destructive development seeds from production migrations, create ordered forward-only migrations, test both fresh installation and upgrades, and remove generic repair instructions from save-error handling. Review the SQL generator too, since it reproduces these definitions.

**F18 — P2: “Full academic year” omits late spring and summer; meeting percentages use different denominators.**

Evidence: [36-week calendar](<D:/VS Projects/E3dady/src/lib/fridayCalendar.ts:66>), [roster rate](<D:/VS Projects/E3dady/src/components/SharedAttendanceTable.tsx:203>), [calendar turnout](<D:/VS Projects/E3dady/src/lib/fridayCalendar.ts:129>), and [summary text](<D:/VS Projects/E3dady/src/components/SharedAttendanceTable.tsx:323>).

The academic calendar claims September–August but generates 36 Fridays. For this academic year, local execution generated 4 September 2026 through 7 May 2027, omitting later dates. The manual date field partly works around this, but year/term navigation is incomplete.

The overall roster percentage divides present by recorded entries, while cohort/calendar percentages divide by total youths. The shared summary displays the former beside a count described as “present out of total youths.” One present student with everyone else unrecorded can therefore yield “100% (1 of 42).” Historical turnout also uses today's roster without membership-at-session history.

Remedy: generate to the actual configured end date. Define separately named recording completeness and turnout metrics, with explicit denominators and historical roster eligibility.

**F19 — P2 feature gap: Notifications are manual tests, not scheduled or closed-app reminders.**

Evidence: [notification implementation](<D:/VS Projects/E3dady/src/components/NotificationModal.tsx:26>) and [OneSignal configuration instructions](<D:/VS Projects/E3dady/src/components/NotificationModal.tsx:156>).

The implementation requests permission and sends a test notification while the app is running. There is no push subscription registration, push-event handler, backend scheduler, or OneSignal SDK integration. Adding the displayed environment variable alone cannot provide the described closed-app capability.

Remedy: either describe the current feature accurately, or implement subscription lifecycle, authenticated targeting, delivery scheduling, and service-worker push handling.

**Performance bottlenecks, ranked**

**B01 — Highest demonstrated CPU bottleneck: repeated history scans and date formatting during row rendering.**

Evidence: [row calculations](<D:/VS Projects/E3dady/src/components/SharedAttendanceTable.tsx:890>), [sparkline computation on every render](<D:/VS Projects/E3dady/src/components/MemberSparkline.tsx:33>), [per-Friday array search and formatter creation](<D:/VS Projects/E3dady/src/lib/pastoralAnalytics.ts:213>), and [directory enrichment before filtering](<D:/VS Projects/E3dady/src/components/YouthDirectory.tsx:104>).

For each visible youth, triage scans the entire attendance array; the sparkline searches it again for each of 12 Fridays. It also constructs an `Intl.DateTimeFormat` for each point. The daily selector calculates a sparkline for every assigned candidate even though only one is displayed. Local status toggles rerender the whole roster and recompute row analytics, even though historical data has not changed.

Synthetic benchmark, running the actual triage plus 12-week sparkline once per youth, with 36 recorded sessions per person; three passes per size:

- 42 youths / 1,512 attendance rows: **60.5–65.8 ms** per calculation pass.
- 200 youths / 7,200 rows: **428.6–528.5 ms**.
- 500 youths / 18,000 rows: **1,247.8–1,443.4 ms**.

These are local Node calculation measurements, not browser frame times, network latency, database latency, or complete React rendering. They use complete synthetic history beyond the current 500-row client limit. They show a scalability problem that becomes especially relevant when fixing that limit. Real mobile behavior requires profiling.

Remedy: index attendance once by youth/date, pre-group history by youth, precompute Friday labels once, reuse formatters, memoize per-youth metrics against relevant history, and compute only the selected candidate's sparkline. Apply cheap roster filters before enrichment. Then measure whether pagination or virtualization is necessary.

**B02 — Broad invalidation: one context couples every data domain.**

Evidence: [provider value](<D:/VS Projects/E3dady/src/context/AppContext.tsx:787>) and [attendance change subscription](<D:/VS Projects/E3dady/src/context/AppContext.tsx:300>).

Every provider state change changes the context value and updates all its consumers. A follow-up action can trigger unrelated attendance/schedule/header work. A bulk attendance save may produce one realtime event per affected row; each event currently scans and copies the global array and can trigger the expensive roster calculations and draft-reset effect.

Remedy: separate session/identity, directory, attendance, schedules, and contact state or use selective subscriptions. Keep editor state local and per row. Batch/coalesce incoming events where appropriate. Memoizing the provider value alone will not isolate consumers when one of its actual fields changes.

**B03 — Main-thread persistence: all datasets are serialized for every domain change.**

Evidence: [persistence effect](<D:/VS Projects/E3dady/src/context/AppContext.tsx:342>) and [explicit attendance persistence](<D:/VS Projects/E3dady/src/context/AppContext.tsx:530>).

Changing a selected servant, contact checkbox, or one attendance record rewrites servants, youth, attendance, schedules, and contacted IDs synchronously. Saves also perform an additional explicit write and broadcast a complete attendance snapshot. Work grows with total history rather than with the size of a mutation. Storage errors are swallowed.

Remedy: persist changed entities/operations in IndexedDB, avoid duplicate full snapshots, batch cache work, and surface quota/storage failures where durability matters. Do not debounce a write that the UI has already promised is safely persisted unless a durable operation record exists first.

**B04 — Initial delivery: all tabs are eagerly imported into one client page.**

Evidence: [page imports](<D:/VS Projects/E3dady/src/app/page.tsx:1>).

The page statically imports attendance, directories, schedules, servant management, and dialogs. This makes their code reachable from the initial client entry even when only follow-up is visible. Initial HTML is a loading screen, and useful data work starts after client effects. Exact shipped bundle sizes were not measured because the production build did not finish.

Remedy: defer infrequently used tabs/dialogs or split route boundaries, keep interactive boundaries focused, and measure transfer size and hydration time after a successful production build. An authorized initial server fetch is an option, but direct browser Supabase access is also viable with correctly enforced RLS.

**B05 — Database optimizations exist in SQL but are disconnected from the application.**

Evidence: [roster RPC](<D:/VS Projects/E3dady/supabase/migrations/20260927_performance_optimization.sql:33>), [bulk RPC](<D:/VS Projects/E3dady/supabase/migrations/20260927_performance_optimization.sql:61>), and [actual reads](<D:/VS Projects/E3dady/src/context/AppContext.tsx:228>).

No `.rpc()` calls exist in application code. The app still loads independent table snapshots and joins them in the browser. The SQL comments' percentage savings and “zero heap fetch” claims were not supported by measurements in this review. The existing attendance save already batches rows into one REST upsert, so the main save problem is not one network request per youth.

Several indexes overlap: the unique `(youth_id, session_date)` constraint, an explicit same-key index, a descending covering variation, and single-column indexes. They may increase write/storage cost; their actual usefulness requires deployed query plans and index-usage statistics. Index-only scans also depend on PostgreSQL visibility state and selected columns.

Remedy: design date-scoped queries/RPCs around actual UI needs, secure any privileged functions before adoption, inspect `EXPLAIN (ANALYZE, BUFFERS)` in a safe environment, and retain/remove indexes based on measured workload. Adding further indexes will not fix the demonstrated browser CPU bottleneck.

**Smaller concerns and coverage gaps**

- [Service-worker navigation caching](<D:/VS Projects/E3dady/public/sw.js:58>) serves an old shell first and retains the fixed `e3dady-v3` cache across releases. Background cache writes are not consistently attached to `event.waitUntil`. Old HTML can refer to removed chunks after deployment; cold offline visits also cannot use chunks that were never cached. Treat this as a deployment/offline test gap rather than a reproduced outage.
- [Schedule schema](<D:/VS Projects/E3dady/supabase/schema.sql:42>) has no unique session date. If the business model is one schedule per Friday, duplicate dates and non-Friday dates need validation/constraints. The attendance date input likewise accepts any date; whether other meeting days are allowed is a product-policy decision.
- The yearly schema lacks an enrollment/academic-year model. Current youths and current school years are used for historical views, and there is no visible promotion/archive workflow. This will matter at the next cohort transition.
- [Viewport settings](<D:/VS Projects/E3dady/src/app/layout.tsx:21>) disable zoom. Custom dialogs also warrant keyboard, focus-trap, screen-reader, and RTL interaction testing.
- Data types are handwritten; the Supabase client has no generated database type parameter. Schema drift such as the missing outcome column therefore bypasses TypeScript checks.
- [README](<D:/VS Projects/E3dady/README.md:1>) is still the framework starter documentation. It does not define safe provisioning, migration order, roles, offline guarantees, recovery, or deployment checks.

**Recommended fix order and acceptance criteria**

1. **Establish trusted access.** Implement authentication and a server/database permission model; audit deployed grants and all privileged RPCs; verify fixture data is synthetic. Acceptance: anonymous users cannot access private records, ordinary servants cannot grant themselves admin or perform admin-only operations, and forged actor IDs are rejected.
2. **Make persistence truthful.** Standardize errors, remove the state-updater side channel, implement durable pending operations/retry or explicitly limit offline claims, and safely reconcile remote snapshots. Acceptance: rejected writes are visible; refresh/reconnect cannot discard acknowledged pending work; failed deletes do not look permanently successful.
3. **Repair attendance editing.** Track dirty updates and deletes, protect drafts during navigation/realtime, add concurrency checks, enforce lifecycle rules, and persist real audit records. Acceptance: two devices can edit different rows without losing changes; same-row conflicts are detected; clearing survives reload; an archived edit has an attributable before/after audit entry.
4. **Unify business logic.** Fix complete-window fetching, cutoff dates, timezone/day rollover, daily task identity, shared streak semantics, and contact logging/form state. Acceptance: historical views never use later records; Cairo midnight behaves correctly; the daily task remains completed until the next service day; contact method and notes belong to the intended youth.
5. **Optimize measured hot paths.** Build attendance maps, share labels/formatters, cache per-youth metrics, isolate state subscribers, reduce storage writes, and defer unused UI. Acceptance: profile a production build on a representative phone with complete history; status changes should not trigger full-history analytics work. Set explicit interaction and initial-load targets from that baseline.
6. **Make releases repeatable.** Separate safe migrations from destructive seeds; run typecheck, lint, fresh-install/upgrade checks, focused business-logic tests, and a small set of multi-user/offline integration tests in CI. Resolve the font-download dependency or self-host fonts, then complete production-build verification.

The existing strengths are worth preserving: attendance has a database uniqueness constraint, bulk saves already use one upsert request, input searches and utility functions have some clear separation, and attendance subscriptions have cleanup logic. The needed work is to make identity, drafts, persistence, and analytics consistent before expanding the feature set or scaling infrastructure.
