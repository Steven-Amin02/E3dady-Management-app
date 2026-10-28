import { performance } from 'node:perf_hooks';
import { source } from '../tests/load-source.mjs';
const { getPastFridayDates, evaluateYouthPastoralRisk, calculateMemberSparkline } = source('src/lib/pastoralAnalytics.ts');
for (const count of [42, 200, 500]) {
  const youth = Array.from({ length: count }, (_, i) => ({ id: String(i), name: 'Synthetic', phone: '', school_year: '1st Prep', assigned_servant_id: 's', notes: '' }));
  const attendance = getPastFridayDates(36, '2026-10-23').flatMap(date => youth.map(y => ({ id: y.id + date, youth_id: y.id, session_date: date, status: 'present', recorded_by: 's' })));
  const times = [];
  for (let run = 0; run < 3; run++) {
    const start = performance.now();
    for (const member of youth) {
      evaluateYouthPastoralRisk(member, attendance, '2026-10-23');
      calculateMemberSparkline(member.id, attendance, 12, '2026-10-23');
    }
    times.push(Number((performance.now() - start).toFixed(2)));
  }
  console.log(JSON.stringify({ youths: count, attendanceRows: attendance.length, calculationPassMs: times }));
}
