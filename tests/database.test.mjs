import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { before, after, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const migration = await readFile(new URL('../supabase/migrations/20261028_security_and_reliability.sql', import.meta.url), 'utf8');
const ids = {
  admin: '10000000-0000-0000-0000-000000000001', servant: '10000000-0000-0000-0000-000000000002',
  other: '10000000-0000-0000-0000-000000000003', unlinked: '10000000-0000-0000-0000-000000000004',
  adminServant: '20000000-0000-0000-0000-000000000001', servantRow: '20000000-0000-0000-0000-000000000002',
  otherServant: '20000000-0000-0000-0000-000000000003', youth: '30000000-0000-0000-0000-000000000001',
  otherYouth: '30000000-0000-0000-0000-000000000002',
};
const authSchema = `CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth TO anon,authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;`;
let db, date;
async function migrate(database) {
  try { await database.exec(migration); } catch (error) { throw new Error(`Migration failed (${error.code}): ${error.message}`); }
}
async function asUser(role, user, action) {
  await db.exec(`SET ROLE ${role}`);
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [user ?? '']);
  try { return await action(); } finally { await db.exec("RESET ROLE; SELECT set_config('request.jwt.claim.sub','',false)"); }
}
const changes = (status, expected_version = null, youth_id = ids.youth) => [{ youth_id, session_date: date, status, expected_version }];
async function record(payload, operationId = randomUUID(), category = 'clerical_correction', notes = 'Verified correction') {
  return db.query('SELECT public.record_attendance_changes($1,$2::jsonb,$3,$4) AS result', [operationId, JSON.stringify(payload), category, notes]);
}
before(async () => {
  db = await PGlite.create();
  await db.exec(authSchema);
  // Start with the legacy table shape and an operational record already present.
  await db.exec(migration.slice(migration.indexOf('CREATE TABLE IF NOT EXISTS public.servants'), migration.indexOf('ALTER TABLE public.servants ADD COLUMN')));
  await db.query('INSERT INTO public.servants(id,name,phone,role) VALUES($1,$2,$3,$4)', [ids.adminServant, 'Synthetic admin', '', 'admin']);
  await migrate(db);
  for (const id of [ids.admin, ids.servant, ids.other, ids.unlinked]) await db.query('INSERT INTO auth.users VALUES($1)', [id]);
  await db.query('UPDATE public.servants SET auth_user_id=$1 WHERE id=$2', [ids.admin, ids.adminServant]);
  await db.query("INSERT INTO public.servants(id,name,phone,role,auth_user_id) VALUES($1,'Synthetic servant','','servant',$2),($3,'Other servant','','servant',$4)", [ids.servantRow, ids.servant, ids.otherServant, ids.other]);
  await db.query("INSERT INTO public.youth(id,name,phone,school_year,assigned_servant_id,joined_on) VALUES($1,'Synthetic youth','','1st Prep',$2,NULL),($3,'Other youth','','2nd Prep',$4,NULL)", [ids.youth, ids.servantRow, ids.otherYouth, ids.otherServant]);
  date = (await db.query("SELECT (((now() AT TIME ZONE 'Africa/Cairo')::date - 14) - ((extract(dow FROM (now() AT TIME ZONE 'Africa/Cairo')::date)::integer + 2) % 7))::text AS date")).rows[0].date;
});
after(async () => { await db?.close(); });

test('migration upgrades legacy tables without deleting records', async () => {
  const result = await db.query('SELECT name FROM public.servants WHERE id=$1', [ids.adminServant]);
  assert.equal(result.rows[0].name, 'Synthetic admin');
  const columns = (await db.query("SELECT column_name FROM information_schema.columns WHERE table_name='follow_up_logs'")).rows.map(row => row.column_name);
  assert.ok(columns.includes('outcome'));
  assert.ok(columns.includes('contacted_at'));
});
test('anonymous and unlinked accounts cannot read operational records or invoke mutations', async () => {
  await asUser('anon', null, async () => {
    await assert.rejects(db.query('SELECT * FROM public.youth'), error => error.code === '42501');
    await assert.rejects(record(changes('present')), error => error.code === '42501');
  });
  await asUser('authenticated', ids.unlinked, async () => {
    assert.equal((await db.query('SELECT * FROM public.youth')).rows.length, 0);
    await assert.rejects(record(changes('present')), error => error.code === '42501');
  });
});
test('servants can read shared records but cannot escalate roles, forge actors, or bypass attendance transactions', async () => {
  await asUser('authenticated', ids.servant, async () => {
    assert.equal((await db.query('SELECT * FROM public.youth')).rows.length, 2);
    const updated = await db.query("UPDATE public.servants SET role='admin' WHERE id=$1 RETURNING id", [ids.servantRow]);
    assert.equal(updated.rows.length, 0);
    await assert.rejects(db.query('UPDATE public.servants SET auth_user_id=$1 WHERE id=$2', [ids.servant, ids.adminServant]), error => error.code === '42501');
    await assert.rejects(db.query("INSERT INTO public.attendance(youth_id,session_date,status) VALUES($1,$2,'present')", [ids.youth, date]), error => error.code === '42501');
    await assert.rejects(db.query('UPDATE public.youth SET last_contacted_at=now() WHERE id=$1', [ids.youth]), error => error.code === '42501');
    await record(changes('present', null, ids.otherYouth));
  });
});
test('archived attendance edits require both admin identity and a reason', async () => {
  await asUser('authenticated', ids.admin, async () => {
    await assert.rejects(record(changes('present'), randomUUID(), '', ''), error => error.code === '42501');
    await record(changes('present'));
  });
  const audit = await db.query('SELECT * FROM public.attendance_audit WHERE youth_id=$1', [ids.youth]);
  assert.equal(audit.rows.length, 1);
  assert.equal(audit.rows[0].before_value, null);
  assert.equal(audit.rows[0].after_value.status, 'present');
  assert.equal(audit.rows[0].auth_user_id, ids.admin);
});
test('operation retries are idempotent and cannot reuse IDs with another payload', async () => {
  const version = Number((await db.query('SELECT version FROM public.attendance WHERE youth_id=$1', [ids.youth])).rows[0].version);
  const operation = randomUUID(), payload = changes('absent', version);
  await asUser('authenticated', ids.admin, async () => {
    await record(payload, operation);
    await record(payload, operation);
    await assert.rejects(record(changes('excused', version), operation), error => error.code === '22023');
  });
  assert.equal(Number((await db.query('SELECT count(*) FROM public.attendance_audit WHERE operation_id=$1', [operation])).rows[0].count), 1);
});
test('stale versions reject the entire batch and cannot overwrite another edit', async () => {
  const before = (await db.query('SELECT * FROM public.attendance WHERE youth_id=$1', [ids.youth])).rows[0];
  await asUser('authenticated', ids.admin, async () => {
    await assert.rejects(record([...changes('present', null, ids.otherYouth), ...changes('excused', Number(before.version) - 1)]), error => error.code === '40001');
  });
  assert.equal((await db.query('SELECT * FROM public.attendance WHERE youth_id=$1', [ids.otherYouth])).rows.length, 1);
  assert.equal((await db.query('SELECT status FROM public.attendance WHERE youth_id=$1', [ids.otherYouth])).rows[0].status, 'present');
  assert.equal((await db.query('SELECT status FROM public.attendance WHERE youth_id=$1', [ids.youth])).rows[0].status, before.status);
});
test('explicit deletion removes the record and leaves a before/after audit trail', async () => {
  const version = Number((await db.query('SELECT version FROM public.attendance WHERE youth_id=$1', [ids.youth])).rows[0].version);
  const operation = randomUUID();
  await asUser('authenticated', ids.admin, () => record(changes(null, version), operation));
  assert.equal((await db.query('SELECT * FROM public.attendance WHERE youth_id=$1', [ids.youth])).rows.length, 0);
  const audit = (await db.query('SELECT * FROM public.attendance_audit WHERE operation_id=$1', [operation])).rows[0];
  assert.equal(audit.before_value.status, 'absent');
  assert.equal(audit.after_value, null);
});
test('daily assignment is stable and restricted to the authenticated servant', async () => {
  await asUser('authenticated', ids.servant, async () => {
    await assert.rejects(db.query('SELECT * FROM public.claim_daily_follow_up_task($1)', [ids.otherYouth]), error => error.code === '42501');
    const first = (await db.query('SELECT * FROM public.claim_daily_follow_up_task($1)', [ids.youth])).rows[0];
    const again = (await db.query('SELECT * FROM public.claim_daily_follow_up_task($1)', [ids.otherYouth])).rows[0];
    assert.equal(again.id, first.id);
    assert.equal(again.youth_id, ids.youth);
  });
});
test('follow-up writes atomically record the outcome, update the timestamp, and complete the daily task', async () => {
  const operation = randomUUID(), contacted = new Date().toISOString();
  const params = [operation, ids.youth, 'whatsapp', 'exams_study', 'Synthetic notes', contacted];
  await asUser('authenticated', ids.servant, async () => {
    await db.query('SELECT public.record_follow_up($1,$2,$3,$4,$5,$6)', params);
    await db.query('SELECT public.record_follow_up($1,$2,$3,$4,$5,$6)', params);
    await assert.rejects(db.query('SELECT public.record_follow_up($1,$2,$3,$4,$5,$6)', [randomUUID(), ids.otherYouth, ...params.slice(2)]), error => error.code === '42501');
  });
  const log = (await db.query('SELECT * FROM public.follow_up_logs WHERE id=$1', [operation])).rows[0];
  assert.equal(log.method, 'whatsapp'); assert.equal(log.outcome, 'exams_study'); assert.equal(log.servant_id, ids.servantRow);
  assert.ok((await db.query('SELECT last_contacted_at FROM public.youth WHERE id=$1', [ids.youth])).rows[0].last_contacted_at);
  assert.ok((await db.query('SELECT completed_at FROM public.daily_follow_up_tasks WHERE servant_id=$1', [ids.servantRow])).rows[0].completed_at);
});
test('a single failed follow-up request changes neither timestamp nor log', async () => {
  const before = (await db.query('SELECT last_contacted_at FROM public.youth WHERE id=$1', [ids.youth])).rows[0].last_contacted_at;
  const id = randomUUID();
  await asUser('authenticated', ids.servant, () => assert.rejects(db.query('SELECT public.record_follow_up($1,$2,$3,$4,$5,$6)', [id, ids.youth, 'call', 'invalid-outcome', '', new Date().toISOString()]), error => error.code === '22023'));
  assert.equal((await db.query('SELECT * FROM public.follow_up_logs WHERE id=$1', [id])).rows.length, 0);
  assert.deepEqual((await db.query('SELECT last_contacted_at FROM public.youth WHERE id=$1', [ids.youth])).rows[0].last_contacted_at, before);
});
test('retrying a contact operation remains idempotent across database timezone changes', async () => {
  const log = (await db.query('SELECT * FROM public.follow_up_logs LIMIT 1')).rows[0];
  const before = Number((await db.query('SELECT count(*) FROM public.follow_up_logs')).rows[0].count);
  try {
    await db.exec("SET TIME ZONE 'Pacific/Auckland'");
    await asUser('authenticated', ids.servant, () => db.query('SELECT public.record_follow_up($1,$2,$3,$4,$5,$6)', [log.id, log.youth_id, log.method, log.outcome, log.notes, log.contacted_at]));
    assert.equal(Number((await db.query('SELECT count(*) FROM public.follow_up_logs')).rows[0].count), before);
  } finally { await db.exec("SET TIME ZONE 'UTC'"); }
});
test('the last linked administrator cannot demote or delete themselves', async () => {
  await asUser('authenticated', ids.admin, async () => {
    await assert.rejects(db.query("UPDATE public.servants SET role='servant' WHERE id=$1", [ids.adminServant]), error => error.code === '23514');
    await assert.rejects(db.query('DELETE FROM public.servants WHERE id=$1', [ids.adminServant]), error => error.code === '23514');
  });
});
test('reapplying migration removes old permissive policies while preserving data', async () => {
  const before = Number((await db.query('SELECT count(*) FROM public.follow_up_logs')).rows[0].count);
  await db.exec('GRANT ALL ON public.youth TO anon; CREATE POLICY legacy_open ON public.youth FOR ALL TO anon USING(true) WITH CHECK(true)');
  await migrate(db);
  assert.equal(Number((await db.query('SELECT count(*) FROM public.follow_up_logs')).rows[0].count), before);
  await asUser('anon', null, () => assert.rejects(db.query('SELECT * FROM public.youth'), error => error.code === '42501'));
});
test('migration also bootstraps a fresh database', async () => {
  const fresh = await PGlite.create();
  try { await fresh.exec(authSchema); await migrate(fresh); assert.equal((await fresh.query('SELECT * FROM public.youth')).rows.length, 0); }
  finally { await fresh.close(); }
});
test('schedules require a Friday and reject duplicate sessions', async () => {
  await asUser('authenticated', ids.admin, async () => {
    await db.query("INSERT INTO public.service_schedules(date,lesson_title) VALUES($1,'Synthetic lesson')", [date]);
    await assert.rejects(db.query("INSERT INTO public.service_schedules(date,lesson_title) VALUES($1,'Duplicate')", [date]), error => error.code === '23505');
    await assert.rejects(db.query("INSERT INTO public.service_schedules(date,lesson_title) VALUES($1::date+2,'Wrong day')", [date]), error => error.code === '23514');
  });
});
test('annual promotion is admin-only, idempotent, and retains historical school years', async () => {
  const year = (await db.query("SELECT public.academic_year_start((now() AT TIME ZONE 'Africa/Cairo')::date)::text AS year")).rows[0].year;
  const previous = `${Number(year.slice(0, 4)) - 1}-09-01`, graduate = randomUUID();
  await db.query("INSERT INTO public.youth(id,name,phone,school_year,joined_on) VALUES($1,'Synthetic graduate','','3rd Prep',$2)", [graduate, previous]);
  await db.query('UPDATE public.youth SET joined_on=$1 WHERE id=$2', [previous, ids.youth]);
  await db.query('DELETE FROM public.youth_school_years WHERE academic_year_start=$1 AND youth_id IN ($2,$3)', [year, ids.youth, graduate]);
  await db.query("INSERT INTO public.youth_school_years(youth_id,academic_year_start,school_year) VALUES($1,$2,'1st Prep'),($3,$2,'3rd Prep')", [ids.youth, previous, graduate]);
  await asUser('authenticated', ids.servant, () => assert.rejects(db.query('SELECT public.promote_academic_year()'), error => error.code === '42501'));
  await asUser('authenticated', ids.admin, async () => {
    await db.query('SELECT public.promote_academic_year()');
    assert.equal((await db.query('SELECT public.promote_academic_year() AS result')).rows[0].result.count, 0);
  });
  assert.equal((await db.query('SELECT school_year FROM public.youth WHERE id=$1', [ids.youth])).rows[0].school_year, '2nd Prep');
  assert.equal((await db.query('SELECT school_year FROM public.youth_school_years WHERE youth_id=$1 AND academic_year_start=$2', [ids.youth, previous])).rows[0].school_year, '1st Prep');
  assert.equal((await db.query('SELECT left_on::text FROM public.youth WHERE id=$1', [graduate])).rows[0].left_on, year);
});
