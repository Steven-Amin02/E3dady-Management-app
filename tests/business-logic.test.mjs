import assert from 'node:assert/strict';
import test from 'node:test';
import { source } from './load-source.mjs';
const dates = source('src/lib/serviceDate.ts');
const analytics = source('src/lib/pastoralAnalytics.ts');
const model = source('src/lib/attendanceModel.ts');
const rotation = source('src/lib/followUpRotation.ts');
const calendar = source('src/lib/fridayCalendar.ts');
const youth = { id: 'a', name: 'Synthetic member', phone: '', school_year: '1st Prep', assigned_servant_id: 's', notes: '', created_at: '2025-01-01T00:00:00Z' };
const row = (date, status, id = 'a', version = 1) => ({ id: id + date, youth_id: id, session_date: date, status, recorded_by: 's', version });

test('Cairo business dates and calendar arithmetic survive timezone and DST changes', () => {
  for (const zone of ['UTC', 'America/Los_Angeles', 'Asia/Tokyo']) {
    process.env.TZ = zone;
    assert.equal(dates.serviceDate(new Date('2026-10-27T22:30:00Z')), '2026-10-28');
    assert.equal(dates.addDays('2026-10-30', -7), '2026-10-23');
    assert.equal(dates.dateDistance('2026-11-01', '2026-10-30'), 2);
    assert.equal(dates.precedingFriday('2026-10-23'), '2026-10-16');
    assert.equal(dates.precedingFriday('2026-10-23', true), '2026-10-23');
  }
  assert.equal(dates.validDate('2026-02-30'), false);
});
test('historical risk evaluation excludes later attendance', () => {
  const records = [row('2026-10-16', 'present'), ...['23', '30'].map(d => row(`2026-10-${d}`, 'absent')), row('2026-11-06', 'absent')];
  const risk = analytics.evaluateYouthPastoralRisk(youth, records, '2026-10-16');
  assert.equal(risk.consecutiveAbsences, 0);
  assert.equal(risk.category, 'regular_active');
});
test('excused sessions and unknown Fridays break consecutive absence streaks', () => {
  const oldAbsences = ['02', '09', '16'].map(d => row(`2026-10-${d}`, 'absent'));
  assert.equal(analytics.evaluateYouthPastoralRisk(youth, [row('2026-10-23', 'excused'), ...oldAbsences], '2026-10-23').consecutiveAbsences, 0);
  assert.equal(analytics.evaluateYouthPastoralRisk(youth, oldAbsences, '2026-10-23').consecutiveAbsences, 0);
  assert.equal(analytics.calculateMemberSparkline('a', oldAbsences, 12, '2026-10-23').streakCount, 0);
  assert.equal(analytics.evaluateYouthPastoralRisk(youth, oldAbsences, '2026-10-16').category, 'critical_dropout');
});
test('fading-regular analysis uses six actual Fridays and a separate historical baseline', () => {
  const fridays = model.fridayWindow(18, '2026-10-23');
  const records = fridays.map((date, index) => row(date, index < 12 || index === 17 || index === 14 ? 'present' : 'absent'));
  assert.equal(analytics.evaluateYouthPastoralRisk(youth, records, '2026-10-23').category, 'fading_regular');
  assert.notEqual(analytics.evaluateYouthPastoralRisk(youth, records.filter(r => r.session_date !== fridays[15]), '2026-10-23').category, 'fading_regular');
});
test('an old member with sparse history is not considered newly enrolled', () => {
  const records = [row('2026-10-02', 'present'), row('2026-10-16', 'absent'), row('2026-10-23', 'absent')];
  assert.equal(analytics.evaluateYouthPastoralRisk(youth, records, '2026-10-23').isNewcomer, false);
});
test('contact-day and Friday-morning classification uses Cairo dates', () => {
  const midnight = rotation.selectDailyFollowUpYouth([{ ...youth, last_contacted_at: '2026-10-27T22:30:00Z' }], [], 's', '2026-10-28');
  assert.equal(midnight.alreadyContactedToday, true);
  const morning = rotation.selectDailyFollowUpYouth([{ ...youth, last_contacted_at: '2026-10-23T07:00:00Z' }], [row('2026-10-23', 'absent')], 's', '2026-10-28');
  assert.equal(morning.priorityRank, 5);
});
test('academic calendar covers September through August and lifecycle locks on Monday', () => {
  const fridays = calendar.generateAcademicFridays(new Date('2026-10-28T12:00:00Z'));
  assert.equal(fridays[0].date, '2026-09-04');
  assert.equal(fridays.at(-1).date, '2027-08-27');
  assert.equal(fridays.length, 52);
  assert.equal(calendar.getSessionLifecycleState('2026-10-23', new Date('2026-10-26T12:00:00Z')).state, 'locked');
  assert.equal(calendar.getSessionLifecycleState('2026-10-23', new Date('2026-10-25T12:00:00Z')).state, 'grace');
});
test('drafts preserve original versions and explicit deletes across unrelated remote changes', () => {
  const records = [row('2026-10-23', 'present')];
  const first = model.editDraft({}, records, '2026-10-23', { a: 'absent' });
  const updated = model.editDraft(first, [row('2026-10-23', 'excused', 'a', 2)], '2026-10-23', { a: null });
  assert.equal(updated.a.status, null);
  assert.equal(updated.a.expected_version, 1);
  assert.equal(updated.a.base_status, 'present');
  assert.deepEqual(model.editDraft(first, records, '2026-10-23', { a: 'present' }), {});
  assert.equal(model.applyAttendanceChanges(records, [updated.a], 's').length, 0);
});
test('unknown legacy joining dates do not erase imported history; departure preserves historical membership', () => {
  assert.equal(model.eligibleYouth([{ ...youth, created_at: '2026-10-28T12:00:00Z' }], '2026-09-04').length, 1);
  assert.equal(model.eligibleYouth([{ ...youth, left_on: '2026-10-01' }], '2026-09-04').length, 1);
  assert.equal(model.eligibleYouth([{ ...youth, left_on: '2026-10-01' }], '2026-10-02').length, 0);
});
test('sparkline uses cached metrics for unchanged history and invalidates changed arrays', () => {
  const records = [row('2026-10-23', 'present')];
  const a = analytics.calculateMemberSparkline('a', records, 12, '2026-10-23');
  assert.strictEqual(a, analytics.calculateMemberSparkline('a', records, 12, '2026-10-23'));
  assert.notStrictEqual(a, analytics.calculateMemberSparkline('a', [...records], 12, '2026-10-23'));
});
