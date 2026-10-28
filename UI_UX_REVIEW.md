# E3dady — UI/UX review

Reviewed 28 October 2026 against the current working tree, including the recent engineering changes and a rendered sign-in check at a narrow mobile viewport. This is a report, not an implementation change.

## Assessment

The product has a clear purpose and recognizable primary areas, but its interface needs a dedicated usability pass before broad use by volunteers. The highest priorities are first-time access, fast attendance recording, understandable save/recovery states, and accessible controls. A cosmetic redesign alone would leave the most consequential problems in place.

The central UX issue is that users must understand too much about the application's internal state. They encounter distinctions between a saved draft, a queued operation, cloud confirmation, archived-session authorization, and a linked login account. Those distinctions matter, but the interface should turn them into clear actions and reassuring feedback.

For this review, I assume ordinary servants primarily use phones to record attendance and make contact, while administrators also use larger screens for directory and schedule management. These are working assumptions, not findings from user interviews.

## Evidence and limitations

- Inspected the implemented screens, interaction handlers, layout classes, shared styles, dialog behavior, and user-facing messages.
- Computed contrast ratios from the installed Tailwind color values for selected solid foreground/background pairs.
- Compared relevant behaviors with W3C accessibility guidance.
- A local browser check was available for the sign-in surface. I did not run screen-reader sessions, measure all device hit boxes, or observe real users completing tasks.
- Layout risks below are identified from the implementation. Actual clipping, scroll distances, keyboard overlap, and phone-specific behavior require device validation.
- This is a heuristic review, not a complete WCAG conformance audit. I have not assigned an arbitrary numerical usability score or invented completion-rate measurements.

Priority definitions: **High** affects task completion, reliable understanding, accessibility, or recovery. **Medium** causes avoidable friction or weak orientation. **Lower** improves consistency after the core journeys are sound.

## Rendered app evaluation

I reviewed the running application at `http://localhost:3000` with authenticated local data, using the actual rendered home screen rather than source inspection alone.

### Captured viewports

- **Mobile:** 469 × 529 CSS pixels.
- **Desktop:** 1024 × 720 CSS pixels (the browser tool capped the requested larger viewport at this size).

### What the screenshots show

#### Strengths confirmed in the live UI

- The interface has a clear Arabic RTL structure and the current user/connection state is visible in the header.
- The bottom navigation is recognizable and persistent.
- The daily follow-up person is prominent and the main contact actions are visually easy to locate.
- The application has a warm pastoral identity without looking like a generic enterprise back office.
- The desktop view remains centered and readable instead of stretching a phone-oriented card across the entire screen.

#### Highest-impact live findings

1. **The home screen is too tall before the first decision.** On mobile, the user sees the header, a large greeting/verse hero, two summary cards, then only the top of the follow-up card before the fixed bottom navigation. The user must scroll to reach the actual contact controls.
2. **The hero consumes attention without helping the next task.** The verse, decorative background, greeting, date badge, and two metrics create a strong visual statement, but none answers the immediate question: “What should I do now?”
3. **The follow-up card contains too many layers for a one-person task.** Name, grade, a 12-week attendance strip, attendance explanation, pastoral reason, recommendation, prior-contact text, phone number, two contact buttons, and outcome recording all compete in one sequence.
4. **The attendance shortcut is below the daily work.** It is a useful action, but it appears after the large follow-up card and is easy to miss on the first screen.
5. **The five-item bottom navigation is overloaded for a phone workflow.** “الافتقاد”, “الحضور”, “المخدومين”, “الجدول”, and “الخدام” are all presented as equal-weight destinations even though schedule and servant administration are lower-frequency tasks.
6. **The desktop layout is under-utilized.** At 1024 pixels, the working surface is still essentially a narrow mobile column. This is acceptable for follow-up, but directory, attendance review, and administration should use the extra width.
7. **The header actions are ambiguous.** Notification testing, app installation, and sign-out are shown as peer icon buttons. A volunteer should not need to understand which icon is a product feature, a setup utility, or an account action.
8. **The page mixes operational and analytical content.** The attendance sparkline and pastoral recommendation are useful on demand, but they delay the two actions that matter most: contact the person and record the result.

### Senior conclusion from the rendered experience

The app does not need more dashboard content. It needs a shorter decision path. For this type of church/volunteer app, the best experience is a **task-first operational tool**:

> Open app → see today's one action → complete it → receive reassuring save feedback → move to the next task only if needed.

The current visual design should be simplified before adding more metrics, notifications, or decorative treatment.

## Simplification blueprint

### Recommended primary information architecture

Replace the five equal-weight bottom destinations with three primary modes:

1. **اليوم** — the servant's next action:
   - one follow-up task before Friday;
   - one attendance task on Friday;
   - pending work review whenever a local draft or conflict exists.
2. **الحضور** — current and previous Friday sessions.
3. **المخدومون** — people search, contact, and assignment.

Move these to a labelled “المزيد” or account/management menu:

- الجدول;
- الخدام;
- notifications/testing;
- install app;
- backup/recovery;
- sign out.

Administrators may see management shortcuts inside that menu. Ordinary servants should not see a destination that only explains they lack permission.

### Recommended simplified “اليوم” screen

The first viewport should contain only:

1. **Small header:** app name, servant name, connection state, account menu.
2. **One task card:** person, reason, phone/WhatsApp actions, and a short “سجّل النتيجة” action after returning.
3. **One secondary task:** “سجّل حضور الجمعة” with the current session date and outstanding count.
4. **Pending work banner:** only when action is required.

Move below an “عرض التفاصيل” disclosure:

- 12-week sparkline;
- pastoral recommendation;
- long verse/greeting;
- historical contact details;
- extended metrics.

### Recommended simplified follow-up card

Use this order:

1. **شنودة — أولى إعدادي**
2. **سبب الافتقاد:** لم يتم التواصل من قبل.
3. **اتصال** / **واتساب**
4. After return: **سجّل النتيجة**
5. Optional disclosure: **عرض سجل الحضور والرعاية**

The card should fit in the first mobile viewport whenever possible. A volunteer should not need to interpret a chart before making a pastoral contact.

### Recommended simplified attendance flow

Use a task-specific mode instead of an annual dashboard:

1. Header: “حضور الجمعة · ٢٣ أكتوبر”.
2. Summary: “٣٤ غير مسجل” with a prominent “غير مسجل فقط” filter.
3. Search and class filter.
4. Large three-choice row controls.
5. Sticky save bar with changed count.
6. History and annual calendar behind secondary actions.

The annual Friday ribbon is useful for administrators and historical review, but it should not be the first interaction for a servant trying to record today's attendance.

### Content and visual simplification rules

- One primary action per screen.
- One accent color for primary actions; reserve red/amber for attention states.
- Remove decorative hero gradients, glows, and oversized metric cards from routine work screens.
- Keep body and control text readable; avoid making operational instructions 10–12 pixels.
- Use “عرض التفاصيل” for analytics instead of rendering all analytics by default.
- Use explicit text labels for header actions; do not rely on icons for setup/testing/account tasks.
- Keep success feedback short and local to the action that changed.
- Never display technical maintenance information in the main servant workflow.

### Recommended success metrics for the simplification

Validate the simplified design against these behavioral targets rather than visual preference:

- A servant identifies today's primary action within 3 seconds.
- A servant reaches a contact action without scrolling on a 375-pixel-wide phone.
- A servant can find attendance and save a changed row without opening a secondary menu.
- A servant can explain whether a change is saved locally, waiting to sync, or confirmed by the server.
- A servant can complete follow-up without accidentally recording an outcome.
- An administrator can reach schedule, servant management, and archive tools without adding complexity to the servant home.

## What should be preserved

- The five main areas have visible Arabic labels, and the current area has a visual active treatment.
- The page declares Arabic and RTL; phone/email values use LTR where appropriate.
- A single daily follow-up person gives servants a manageable starting task.
- Attendance has explicit present/absent/excused choices, search, class filtering, counts, and historical review.
- Attendance selection buttons already expose `aria-pressed`.
- Draft preservation and distinction between local work and confirmed saves are useful foundations. The next step is making those guarantees easier to understand.
- Dialogs already attempt initial focus placement, focus trapping, and focus return. Browser zoom is allowed and a global focus-visible style exists.
- Pastoral wording and a recognizable church identity suit the context. Preserve that warmth while reducing competing decoration in repetitive work screens.

## Prioritized findings

### UX01 — High: first-time access has no complete user journey

**Evidence:** [SignIn.tsx](<D:/VS Projects/E3dady/src/components/SignIn.tsx:19>) and [ServantsManager.tsx](<D:/VS Projects/E3dady/src/components/ServantsManager.tsx:107>).

The sign-in form provides email and password but no visible explanation of how to obtain an account, no password recovery, and no password-visibility control. For an authenticated but unlinked account, the remaining actions are retry and sign out; retry cannot resolve a missing account link.

The administrator screen describes account management, but adding a servant only creates a directory record. The interface does not show whether that person has a usable login. README instructions do not replace an in-product access journey for ordinary users.

**Recommendation:** add invitation/access-request guidance and a working password-recovery path. Distinguish invalid credentials, no connectivity, and an account awaiting activation. In servant management, display access states such as “دعوة لم تُرسل”، “بانتظار التفعيل”، and “نشط”. Any invitation capability should use an authorized server flow.

**Example copy:** “ليس لديك حساب؟ اطلب دعوة من مسؤول الخدمة.” For the unlinked state: “تم تسجيل الدخول، لكن الوصول يحتاج تفعيل مسؤول الخدمة.”

### UX02 — High: the attendance save action is too far from the work

**Evidence:** the roster renders before its [save button](<D:/VS Projects/E3dady/src/components/SharedAttendanceTable.tsx:154>).

Users make repeated decisions in the roster, but saving is at the end of the full filtered list. A larger roster can require substantial scrolling to find the primary action. This is a task-flow problem even though the draft is safely retained.

**Recommendation:** provide a sticky save bar above the bottom navigation, with the session date and number of changed rows. Keep search/class controls reachable during recording. Add a clear unsaved-changes filter so users can review their work without scanning the full roster again.

**Proposed copy:** “6 تعديلات · محفوظة على الهاتف ولم تُرسل” with a prominent “حفظ التغييرات”. The number here illustrates the proposed design; it is not a measured production count.

### UX03 — High: launching contact also starts outcome recording too early

**Evidence:** [contact-click handler](<D:/VS Projects/E3dady/src/components/DailySingleFollowUpCard.tsx:98>), [external contact links](<D:/VS Projects/E3dady/src/components/DailySingleFollowUpCard.tsx:231>), and [preselected outcome](<D:/VS Projects/E3dady/src/components/PastoralOutcomeModal.tsx:26>).

The same event launches a phone/WhatsApp action and opens the outcome modal. The outcome is not yet known, but the form already selects the positive “encouraged/attending” result. This can encourage accidental acceptance of a result that was never explicitly chosen. The implementation does not automatically log merely opening the link; logging still requires confirmation.

**Recommendation:** separate “ابدأ التواصل” from “سجّل النتيجة”. On return, offer an unobtrusive reminder rather than treating opening an external app as completed contact. Require an explicit outcome choice. Put contact actions before optional analytics/recommendation detail in the daily card.

### UX04 — High: save states are technically accurate but hard to act on

**Evidence:** [SyncStatus.tsx](<D:/VS Projects/E3dady/src/components/SyncStatus.tsx:9>) and [draft/save feedback](<D:/VS Projects/E3dady/src/components/SharedAttendanceTable.tsx:114>).

Offline state, queued work, errors, and legacy-backup information share a large amber panel. A legacy backup can keep that panel visible even when synchronization is healthy. The header's connection status does not summarize pending work, so users must combine information from different locations. Some backend messages are shown without a localized, task-specific next step.

Conflict recovery principally directs users to cancel their draft/operation and re-enter it. That protects the database but puts the reconstruction burden on the user.

**Recommendation:** use explicit, consistently placed states: “مسودة”، “بانتظار الإرسال”، “تم الحفظ”، and “يحتاج مراجعة”. Keep backup maintenance in administration. Provide a conflict comparison showing the saved value, the user's value, and who/when changed the record when available. Preserve the user's intention during resolution. Translate common errors and keep technical detail secondary.

### UX05 — High: sign-out can become a recovery dead end

**Evidence:** [sign-out guard](<D:/VS Projects/E3dady/src/lib/appStore.ts:210>) and [header feedback](<D:/VS Projects/E3dady/src/components/Header.tsx:20>).

Sign-out is blocked while any draft or queued operation exists. The header then displays a message, but offers no inventory of the affected sessions and no direct route to resolve them. On a shared phone, users need a predictable way to leave their account without guessing which screen holds pending work.

**Recommendation:** replace the refusal-only experience with a pending-work review. Identify each affected session/contact and offer relevant save/retry/review actions. Define an explicit policy for keeping work on the device, exporting it, or intentionally discarding it before sign-out. Explain the consequences of each choice; do not silently drop work.

### UX06 — High: some important text has insufficient declared contrast

**Evidence:** [sign-in button](<D:/VS Projects/E3dady/src/components/SignIn.tsx:33>), [contact buttons](<D:/VS Projects/E3dady/src/components/DailySingleFollowUpCard.tsx:236>), and [schedule action](<D:/VS Projects/E3dady/src/components/ServiceScheduleView.tsx:146>).

Calculated from installed Tailwind solid colors:

- White on `sky-600`: **4.10:1**.
- White on `emerald-600`: **3.77:1**.
- White on `amber-600`: **3.19:1**.
- `slate-400` on white: **2.56:1**; relevant to faint secondary/navigation text, with rendered translucent backgrounds still requiring verification.
- White on `sky-700`: **5.93:1**, demonstrating a usable alternative.
- `slate-500` on `slate-50`: **4.55:1**; not every gray treatment fails.

The small/normal-sized button labels do not qualify for the large-text exception. W3C's normal-text threshold is 4.5:1. These measurements concern the declared solid pairs, not a screenshot-wide contrast audit. [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

**Recommendation:** define tested action, secondary-text, and focus tokens. Use darker button fills with white labels, or tested dark labels on lighter fills. Verify hover, selected, disabled, light, and any supported dark states separately.

### UX07 — High: compact attendance history is hard to operate and interpret

**Evidence:** [sparkline controls](<D:/VS Projects/E3dady/src/components/MemberSparkline.tsx:97>) and [icon removal in compact mode](<D:/VS Projects/E3dady/src/components/MemberSparkline.tsx:59>).

The interactive cells are clickable `div` elements without keyboard activation/focus. Compact cells are nominally 14 CSS pixels with a 4-pixel gap at the default root size. Compact mode removes status icons, leaving color as the primary immediate cue. Date/status information is mainly revealed by hover/tap or the native title tooltip.

**Recommendation:** retain the strip as a visual summary, but provide an accessible named control and a readable history alternative. Add visible status keys and meaningful non-color cues. Use larger hit areas or a single “عرض سجل الحضور” entry point rather than requiring precise taps on adjacent tiny cells.

WCAG 2.2's AA pointer-target minimum is 24 CSS pixels with defined exceptions; 44–48 pixels is a proposed comfort target for this phone-focused product, not a blanket AA requirement. Formal assessment must consider spacing/equivalent-control exceptions. [W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [W3C use-of-color guidance](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html).

### UX08 — High: visible form instructions and accessible field names are inconsistent

**Evidence:** [youth form labels](<D:/VS Projects/E3dady/src/components/YouthDirectory.tsx:350>), [schedule form labels](<D:/VS Projects/E3dady/src/components/ServiceScheduleView.tsx:265>), and [audit explanation](<D:/VS Projects/E3dady/src/components/AdminAuditReasonModal.tsx:102>).

Several CRUD labels are separate siblings of inputs without `htmlFor`/matching IDs. Placeholders containing examples are not a substitute for correctly associated labels. Sign-in's wrapped labels are a better existing pattern to reuse.

The audit explanation explicitly says “اختياري”, while its textarea is required with a three-character minimum. Whitespace can also reach the trimmed-length check and return without a helpful inline explanation. Users are told conflicting rules at the point of submission.

**Recommendation:** associate every label, expose helper/error text with `aria-describedby`, and state required rules before submission. Change the audit label to “سبب التعديل — مطلوب”, with the minimum clearly explained. Keep validation next to the relevant field and preserve entered values. [W3C labels/instructions guidance](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html).

### UX09 — High: modal behavior and layering are incomplete

**Evidence:** [Portal.tsx](<D:/VS Projects/E3dady/src/components/Portal.tsx:14>), [history overlay](<D:/VS Projects/E3dady/src/components/SharedAttendanceTable.tsx:160>), and [global form-error banner](<D:/VS Projects/E3dady/src/components/YouthDirectory.tsx:144>).

The shared portal handles Tab trapping but not Escape dismissal or background inertness. It only searches `h1,h2,h3` for a dialog name, while some confirmation headings use `h4`. Some icon-only close controls lack an explicit descriptive name.

The attendance history backdrop has no explicit stacking level, while the header/navigation use `z-40`. This creates a source-level layering conflict to resolve. Error banners at `z-[100]` are outside the dialog, so they can compete with its controls and are outside its trapped keyboard sequence.

**Recommendation:** use one dialog system with explicit title/description IDs, appropriate Escape behavior, consistent overlay layers, and an inert background. Put form feedback inside the dialog. Preserve the focus-return behavior already implemented. [W3C modal-dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

### UX10 — High: unknown, unavailable, and zero are not consistently distinguished

**Evidence:** [availability/lock state](<D:/VS Projects/E3dady/src/components/SharedAttendanceTable.tsx:58>), [rendered statistics](<D:/VS Projects/E3dady/src/components/SharedAttendanceTable.tsx:129>), and [default triage](<D:/VS Projects/E3dady/src/lib/pastoralAnalytics.ts:331>).

Selected-session statistics are rendered even when its data is unavailable/loading, which can present zero attendance as if it were a known result. A person with no attendance records defaults to the regular-active category, producing a reassuring label without supporting history. Different reasons for disabled controls are also combined into one `locked` flag.

**Recommendation:** distinguish “جارِ التحميل”، “لم تُسجل الجلسة”، “غير متاح دون اتصال”، and a verified zero. Use an explicit insufficient-data triage state. Explain the current reason a primary action is unavailable and the next step needed to enable it.

### UX11 — High: calendar fractions and percentages can contradict each other

**Evidence:** [per-date eligible denominator](<D:/VS Projects/E3dady/src/components/FridayCalendarRibbon.tsx:147>) versus [displayed fraction](<D:/VS Projects/E3dady/src/components/FridayCalendarRibbon.tsx:213>).

The percentage uses membership eligible on each Friday, but the displayed fraction uses the selected session's `totalYouthCount`. When membership differs across dates, both numbers can disagree. Illustratively, a historical Friday with 10 present out of 20 eligible could display “10/42” beside “50%” if the selected session has 42 eligible members.

**Recommendation:** calculate the per-card eligible count once and use it for both the fraction and percentage. Show a short explanation of the denominator where historical membership is uncertain.

### UX12 — Medium: navigation needs stronger orientation and keyboard semantics

**Evidence:** [BottomNav.tsx](<D:/VS Projects/E3dady/src/components/BottomNav.tsx:77>), [state-only tab switching](<D:/VS Projects/E3dady/src/app/page.tsx:22>), and [clickable attendance shortcut](<D:/VS Projects/E3dady/src/components/DailyFollowUp.tsx:117>).

Active navigation is communicated visually, without `aria-current` or an implemented tab selection pattern. Main views are controlled only by component state, so URL sharing, refresh restoration, and browser Back do not represent the current module. The attendance shortcut is a clickable `div` rather than a keyboard-operable link/button.

**Recommendation:** choose either route-based primary navigation with current-page semantics or a properly implemented tab pattern. Preserve filters/search when returning to a view. Make the attendance shortcut a native control. Add accurate expanded/collapsed state to the absent-members disclosure.

### UX13 — Medium: the visual hierarchy delays the action users came to perform

**Evidence:** [home hero](<D:/VS Projects/E3dady/src/components/DailyFollowUp.tsx:60>) and [daily-card content order](<D:/VS Projects/E3dady/src/components/DailySingleFollowUpCard.tsx:151>).

The home page places a large greeting/summary before the daily task. Within the daily card, history and recommendations precede contact actions. There are also several competing surfaces, gradients, badges, and small explanatory lines. The source order suggests that the key action may sit too low on a phone; the exact fold position has not been measured.

**Recommendation:** put today's task and its primary action near the top. On meeting day, make “تسجيل حضور الجمعة” prominent. Place explanations and extended history in progressive disclosure. Retain the pastoral tone and give decoration a supporting role.

### UX14 — Medium: the calendar is optimized for browsing the year, not recording this week

**Evidence:** [horizontal 52-session ribbon](<D:/VS Projects/E3dady/src/components/FridayCalendarRibbon.tsx:139>) and [Friday-only date rejection](<D:/VS Projects/E3dady/src/components/SharedAttendanceTable.tsx:77>).

Term filters and many scrollable date cards appear before recording controls. The native date input allows selecting any weekday, then rejects non-Fridays after selection. Selected-date and lifecycle states are not fully conveyed programmatically.

**Recommendation:** lead with the active/latest meeting and clear previous/next controls. Put annual browsing behind “عرض التقويم”. Prefer a session picker containing valid meeting dates, with a visible current-session shortcut. Name each date and its state for assistive technology.

### UX15 — Medium: schedule ordering hides the next practical task

**Evidence:** [descending schedule order](<D:/VS Projects/E3dady/src/components/ServiceScheduleView.tsx:110>).

The immediate next meeting is identified and highlighted, but the list puts the most distant future date first. As the yearly schedule grows, the next meeting can sit well below later events. There is no schedule search or upcoming/past view switch.

**Recommendation:** pin the next meeting at the top, list upcoming meetings chronologically, and collapse past meetings into an archive. Add filtering when the actual schedule size warrants it.

### UX16 — Medium: administrative bulk changes lack an impact preview and recovery route

**Evidence:** [promotion confirmation](<D:/VS Projects/E3dady/src/components/ServantsManager.tsx:89>), [archive confirmation](<D:/VS Projects/E3dady/src/components/YouthDirectory.tsx:454>), and [filtered bulk attendance actions](<D:/VS Projects/E3dady/src/components/SharedAttendanceTable.tsx:151>).

Promotion uses a generic browser confirmation without counts or a preview of who will advance/be archived. Bulk attendance actions identify the visible scope in words but do not prominently quantify it. Youth archive preserves history, but there is no visible archived-members/restore workflow.

**Recommendation:** show the target session/year, affected count, included/excluded scope, and a short preview before committing bulk actions. Offer undo for local attendance staging. Provide an authorized archive review/recovery journey. Keep rare annual administration away from routine servant tasks.

### UX17 — Medium: typography and mobile targets need a shared scale

**Evidence:** [navigation labels](<D:/VS Projects/E3dady/src/components/BottomNav.tsx:114>), [outcome descriptions/truncation](<D:/VS Projects/E3dady/src/components/PastoralOutcomeModal.tsx:144>), and [font aliases](<D:/VS Projects/E3dady/src/app/globals.css:204>).

Many secondary labels use 9–12-pixel text. Important long outcome labels are truncated, while their clarifying descriptions are only 10 pixels. Both Cairo/Tajawal aliases currently resolve to the same system font stack. That is operationally reliable, but the named font classes are not providing two distinct Arabic type treatments.

**Recommendation:** establish a small, tested Arabic type scale, with readable body text and deliberate helper text. A proposed starting point is 16-pixel body, 14-pixel controls/helpers where space allows, and restrained headings; these are design targets, not WCAG-mandated minimum font sizes. Wrap critical choice labels. Prefer 44–48-pixel primary touch controls, with spacing appropriate to rapid one-handed recording.

### UX18 — Medium: desktop and long-content layouts need task-specific adaptation

**Evidence:** [shared 672-pixel content cap](<D:/VS Projects/E3dady/src/app/page.tsx:68>) and [header layout](<D:/VS Projects/E3dady/src/components/Header.tsx:12>).

A narrow centered layout is reasonable for one-person follow-up but gives directory, attendance, and schedule administration little additional capacity on larger screens. The header also combines a variable-length Arabic name with three icon actions without an explicit long-name treatment.

**Recommendation:** preserve a focused mobile layout while allowing a wider desktop workspace for administrative lists. Use predictable name wrapping/truncation with access to the full name. Validate at narrow widths, large text, long Arabic names, and with the on-screen keyboard open before declaring the layouts robust.

### UX19 — Lower: secondary features and visual states need clearer product boundaries

**Evidence:** [header actions](<D:/VS Projects/E3dady/src/components/Header.tsx:18>), [initial loader](<D:/VS Projects/E3dady/src/app/page.tsx:29>), and [shared motion styles](<D:/VS Projects/E3dady/src/app/globals.css:91>).

A bell suggests a notification inbox, but currently opens a manual notification test. Sign-out sits beside those secondary icons. Initial loading uses an animated, fixed-width bar without a meaningful progress value. Smooth scrolling/pulsing animations have no reduced-motion override in the inspected styles. Dark variants exist without an implemented theme control/system-preference binding.

**Recommendation:** move test/install/help utilities into a labelled account/help area. Use an honest indeterminate loader or per-view skeleton, with recovery guidance for slow/offline states. Respect reduced-motion preferences. Standardize the existing light experience first; complete and test dark mode only if it is part of the intended product scope.

## Recommended interaction direction

**First access:** invitation/access guidance → establish/recover password → sign in → clear account/role status → today's task. An account awaiting activation needs a useful administrator-contact action, not repeated retries.

**Friday recording:** active session → search/class filter → compact roster with obvious selected states → sticky changed-count/save action → explicit device-pending or server-confirmed feedback → review/correct exceptions. Keep history available without making every row visually compete with the recording controls.

**Daily follow-up:** person's name and reason → call/WhatsApp → return → explicitly choose the result → optional note → clear recorded/pending/confirmed state. Show history and fuller recommendations on demand.

**Administration:** directory record and login-access status should be visibly separate. Bulk changes need a preview and outcome summary. Archives should be reviewable through a supported interface.

## Recommended end-to-end product flow

The app should behave like a focused weekly ministry tool, not like a collection of separate administrative screens. The user's next meaningful action should be obvious at every point, and technical state should be translated into a plain-language decision.

### 1. Entry, access, and role orientation

**Goal:** a servant knows how to get access, signs in, and immediately understands what to do next.

1. **Loading:** show the app identity and an honest indeterminate loading state. Do not imply a percentage unless progress is measurable.
2. **Signed out:** show email, password, password visibility, “نسيت كلمة المرور؟”, and “ليس لديك حساب؟ اطلب دعوة من مسؤول الخدمة”.
3. **Authentication error:** keep entered email, identify the problem in plain Arabic, and offer the relevant next action:
   - incorrect credentials → try again or recover password;
   - offline → explain that sign-in requires a connection;
   - account not activated → contact the service administrator;
   - signed in but not linked → show the account email and an administrator-contact action.
4. **First authenticated view:** show the servant's name, role, connection state, and one primary card:
   - before Friday: “مهمة الافتقاد اليوم”;
   - on Friday: “سجّل حضور اجتماع اليوم”;
   - when there is pending work: “راجع التغييرات المحفوظة على الجهاز”.
5. **Account/help menu:** move install guidance, notification testing, password/account help, and sign-out into one labelled menu. Do not make a test notification look like an inbox.

**Required invariant:** no access state should end with “إعادة المحاولة” as the only useful action when retry cannot solve the problem.

### 2. Daily follow-up flow

**Goal:** complete one real contact without prematurely recording an outcome.

1. Show one assigned youth with name, grade, phone/contact actions, and a short reason for selection.
2. Keep the primary actions near the top: “اتصال” and “واتساب”. History, attendance trend, and recommendations should be collapsible.
3. When the servant selects a contact method, open the external phone or WhatsApp action first.
4. When the servant returns to the app, show a small reminder: “هل تم التواصل؟ سجّل النتيجة”.
5. Open the outcome form with **no outcome selected**. Require an explicit selection:
   - تم التواصل وكان مشجعاً;
   - يحتاج متابعة;
   - لم يرد;
   - طلب عدم التواصل الآن;
   - رقم غير صالح/تعذر التواصل.
6. Make notes optional, clearly labelled, and preserve them if saving fails.
7. After confirmation, show the recorded method, outcome, timestamp, and sync state. The card should move to a completed state without hiding how to correct the record.
8. If offline, save locally and say exactly what happened: “تم حفظ النتيجة على هذا الجهاز، وستُرسل عند عودة الاتصال”.

**Do not infer:** opening a phone or WhatsApp link is not proof that contact happened, and a positive outcome must never be preselected.

### 3. Friday attendance flow

**Goal:** record attendance quickly, safely, and with minimal scrolling.

1. Open the latest valid Friday session by default and identify it as “اجتماع اليوم” or “آخر اجتماع”.
2. Put the session selector, search, class filter, and “غير مسجل فقط” filter before the roster.
3. Show a compact summary near the controls: حاضر، غائب، معتذر، غير مسجل.
4. Each row should prioritize name, current status, and three large status controls. Keep contact and history secondary.
5. As soon as one row changes, show a sticky save bar above bottom navigation:
   - changed count;
   - session date;
   - “حفظ التغييرات”;
   - “مسودة محفوظة على الجهاز” before upload;
   - “تم الحفظ على الخادم” after confirmation.
6. After save, keep the user on the same filtered list and show a short success message. Do not reset search, class, scroll position, or selected session.
7. If a session is unavailable, state why:
   - “جارِ تحميل الجلسة”;
   - “لم تُسجل الجلسة بعد”;
   - “غير متاح دون اتصال”;
   - “لا توجد تغييرات للحفظ”.
8. For a conflict, show the affected youth, the local value, the server value, and the latest server timestamp/person where available. Offer:
   - الاحتفاظ بتعديلي;
   - استخدام قيمة الخادم;
   - مراجعة لاحقاً.

**Primary success criterion:** a servant can record several changes, save, and understand whether the work is safe without finding a separate status panel.

### 4. Youth directory flow

**Goal:** find a person quickly and make a safe, reversible change.

1. Start with search and clear filters. Keep the result count visible.
2. Separate ordinary youth information from pastoral analytics. The first view should answer: who is this, which class, who is responsible, and how can I contact them?
3. Use a single “إضافة مخدوم” form with associated labels, inline validation, and preserved input after errors.
4. Show archive status and history separately from active youth. Never make an archived person look like a current zero-attendance record.
5. For delete/archive, show affected records, explain that historical attendance is retained, and offer an undo or an administrator archive screen.
6. Keep servant assignment and login access as different fields. Assigning a person in the directory must not imply that they can sign in.

### 5. Schedule flow

**Goal:** make the next Friday useful before making the annual schedule browsable.

1. Pin the next meeting at the top with date, topic, speaker, and activity.
2. List upcoming meetings in chronological order.
3. Put past meetings behind an “الأرشيف” disclosure.
4. For administrators, use a real form with visible date rules, associated labels, and inline errors. The interface should prevent invalid weekdays rather than accept and reject them after selection.
5. Before editing or deleting, show the meeting details and the consequence of the action.

### 6. Administration and annual rollover flow

**Goal:** make high-impact actions understandable and recoverable.

1. Keep servant management, access state, and youth assignment visibly separate.
2. Before promotion/archive, show:
   - source and target academic year;
   - number advancing;
   - number archived;
   - excluded records and why;
   - a short preview of names.
3. Require an explicit confirmation with a specific action label, not a generic browser confirmation.
4. After completion, show a summary and a path to review/restore affected records.
5. Restrict backup download and recovery controls to administration; do not make a technical legacy backup part of routine servant work.

## Product state model and copy system

Every important mutation should expose one state, one explanation, and one next action. Use the same labels across attendance, follow-up, directory, and schedule.

| State | Meaning | User-facing copy | Primary action |
|---|---|---|---|
| مسودة | Changed locally but not submitted | “لديك تعديلات محفوظة على هذا الجهاز” | “مراجعة التعديلات” |
| بانتظار الإرسال | Submitted locally and waiting for the server | “سيتم الإرسال عند عودة الاتصال” | “إعادة المزامنة” |
| تم الحفظ | Server confirmed the change | “تم الحفظ على الخادم” | “إغلاق” |
| يحتاج مراجعة | Server rejected or conflicted with the local change | “تغيرت البيانات على الخادم أثناء تعديلك” | “مراجعة التعارض” |
| غير متاح | The data cannot currently be verified | “لا يمكن التحقق من هذه البيانات الآن” | “إعادة المحاولة” |
| مؤرشف | Historical record excluded from active work | “هذا السجل مؤرشف، وتاريخه محفوظ” | “عرض السجل” |

Avoid one generic amber panel for all states. A success state should not look like an error, and a maintenance notice should not compete with an action-blocking conflict.

## Proposed navigation and information architecture

### Servant view

1. **اليوم** — daily follow-up or today's attendance task.
2. **الحضور** — current/previous Friday sessions, with the latest session first.
3. **المخدومون** — search, contact, assignment, and readable history.
4. **الجدول** — next meeting first, then upcoming schedule.
5. **الحساب** — role, connection/help, installation, and sign-out.

### Administrator view

Keep the servant navigation, then expose administration through a clearly labelled management area:

- المخدومون وإسنادهم;
- الخدام وحالة الوصول;
- الجدول;
- الأرشيف والاستعادة;
- النسخ الاحتياطي and technical maintenance.

Do not give routine servants a “الخدام” destination that appears available but only displays a permission warning. Hide or move low-frequency administrative destinations when the role does not need them.

## Definition of done for the UX pass

The redesign should not be considered complete until these behaviors are true:

- A new servant can identify how to obtain access and recover a password without reading project documentation.
- A servant can save attendance from the current viewport and immediately understand whether it is local, queued, or server-confirmed.
- Contacting someone never creates an outcome without an explicit user choice.
- Every modal can be opened, understood, dismissed, and exited with keyboard and touch.
- A conflict preserves the user's intended change and offers a comparison rather than forcing re-entry.
- Archived, unavailable, empty, and verified-zero states are visibly different.
- The latest meeting and today's primary action are discoverable before annual history or decoration.
- Destructive and annual actions preview their impact and provide recovery.
- The app remains understandable at 320, 375, 390, 768, and 1280 CSS pixels, with 200% zoom and long Arabic names.

## Delivery order

1. **Task completion and trust:** first-use/recovery, sticky attendance save, explicit contact-result choice, understandable sync/conflict/sign-out recovery, required-note correction, and consistent calendar numbers.
2. **Accessibility:** tested contrast tokens, associated labels, semantic controls/selected states, usable history targets, and consistent dialog behavior/layers.
3. **Hierarchy and navigation:** action-first home, focused weekly recording, state-aware navigation, next-meeting-first schedule, and impact previews.
4. **Visual refinement:** Arabic type scale, spacing/radius/button tokens, responsive administrative layouts, long-content handling, and reduced-motion behavior.

These are priorities, not implementation-time estimates. Final sequencing should account for how frequently the real team performs each task and where actual support requests concentrate.

## Validation plan before design sign-off

Run moderated tasks with a small mix of ordinary servants and administrators, including less technical and older users. Use synthetic contact data for the sessions.

- First-time user obtains access or correctly identifies whom to contact, then signs in without technical instructions.
- Servant records several attendance changes, switches view/date, returns, reviews the changes, and finds Save without scrolling through the full roster.
- User distinguishes a device-saved draft, an offline queued save, a confirmed save, and a conflict; each state has an understandable next action.
- User starts contact without being pushed to record a result prematurely, then chooses the actual result on return.
- Keyboard user can reach primary navigation, open/read history, operate a form, identify the selected outcome, close a dialog, and return focus predictably.
- Administrator previews a yearly promotion/archive and can explain exactly who is affected.
- User can safely resolve pending work and sign out.

Check representative 320/375/390/768/1280 CSS-pixel layouts, large text/200% zoom, long Arabic names, LTR phone/email fields, portrait/landscape, on-screen keyboard overlap, color-vision differences, and actual supported screen readers. Verify contrast and touch-target geometry on rendered states. Test both slow connectivity and offline recovery.

Record completion success, wrong selections, requests for help, save discoverability, state comprehension, and time on task. Establish a baseline before setting numerical improvement targets. The goal is confident, repeatable task completion with fewer opportunities to misunderstand the state of a person's record.
