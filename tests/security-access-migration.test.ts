import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const migration = readFileSync(join(__dirname, '../supabase/migrations/20261106120000_security_access_boundaries.sql'), 'utf8')
let db: PGlite
before(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema storage;
    grant usage on schema public, storage to anon, authenticated, service_role;
    create table posts(id int, published boolean);
    create table items(id int, status text);
    create table item_images(item_id int, url text);
    create table events(id int);
    create table timeline(id int);
    create table newsletter_subscribers(email text);
    create table orders(email text);
    create table cruise_members(email text);
    create table admin_audit_log(metadata jsonb);
    create table player_tracks(key text);
    create table site_settings(key text, value text);
    create table storage.objects(bucket_id text, name text);
    alter table posts enable row level security;
    create policy legacy_admin on posts for all to authenticated using (true);
    create policy legacy_public on posts for select to anon using (published);
    grant all on all tables in schema public, storage to public, anon, authenticated, service_role;
    alter table storage.objects enable row level security;
    create policy legacy_storage on storage.objects for all to authenticated using (true) with check (true);
    create view item_primary_images as select item_id, url from item_images;
    grant select on item_primary_images to anon, authenticated;
    create function fulfill_stripe_checkout_session() returns int language sql security definer as 'select 1';
    create function exec_sql(text) returns int language sql security definer as 'select 1';
    create function execute_sql(text) returns int language sql security definer as 'select 1';
    create function run_sql(text) returns int language sql security definer as 'select 1';
    insert into posts values (1, true), (2, false);
    insert into items values (1, 'published'), (2, 'draft');
    insert into item_images values (1, 'public.jpg'), (2, 'private.jpg');
    insert into events values (1); insert into timeline values (1);
    insert into newsletter_subscribers values ('private@example.test');
    insert into orders values ('buyer@example.test');
    insert into cruise_members values ('member@example.test');
    insert into admin_audit_log values ('{"internal":"private"}');
    insert into site_settings values ('hero', 'public'), ('private_key', 'private');
    insert into storage.objects values ('catalog', 'existing.jpg');
  `)
  await db.exec(migration)
  await db.exec(migration) // Safe to reapply.
})
after(async () => { await db.close() })

async function asRole<T = Record<string, unknown>>(role: 'anon' | 'authenticated' | 'service_role', sql: string) {
  await db.exec(`set role ${role}`)
  try { return await db.query<T>(sql) } finally { await db.exec('reset role') }
}

test('public content remains readable while drafts and internal settings are hidden', async () => {
  for (const role of ['anon', 'authenticated'] as const) {
    assert.deepEqual((await asRole(role, 'select id from posts')).rows, [{ id: 1 }])
    assert.deepEqual((await asRole(role, 'select * from item_primary_images')).rows, [{ item_id: 1, url: 'public.jpg' }])
    assert.deepEqual((await asRole(role, 'select key from site_settings')).rows, [{ key: 'hero' }])
    assert.equal((await asRole(role, 'select * from events')).rows.length, 1)
    assert.equal((await asRole(role, 'select * from timeline')).rows.length, 1)
  }
})

test('anon and ordinary accounts cannot mutate CMS or read private customers', async () => {
  for (const role of ['anon', 'authenticated'] as const) {
    for (const sql of [
      'insert into posts values (3,true)', 'update events set id=2', 'delete from timeline',
      'select * from newsletter_subscribers', 'select * from orders', 'select * from player_tracks',
      'select * from cruise_members', 'select * from admin_audit_log',
      "insert into cruise_members values ('injected@example.test')",
      "insert into admin_audit_log values ('{}')",
      "insert into newsletter_subscribers values ('spam@example.test')",
      'select fulfill_stripe_checkout_session()',
      "select exec_sql('select 1')", "select execute_sql('select 1')", "select run_sql('select 1')",
    ]) await assert.rejects(asRole(role, sql), /permission denied/)
  }
})

test('storage policy blocks direct CMS uploads and deletion despite permissive policies', async () => {
  await assert.rejects(asRole('authenticated', "insert into storage.objects values ('catalog','malicious.html')"), /row-level security/)
  const deleted = await asRole('authenticated', "delete from storage.objects where bucket_id='catalog' returning name")
  assert.equal(deleted.rows.length, 0)
  assert.equal((await asRole('authenticated', 'select * from storage.objects')).rows.length, 1)
})

test('the service role retains admin data, writes and administrative RPC access', async () => {
  assert.equal((await asRole('service_role', 'select * from posts')).rows.length, 2)
  assert.equal((await asRole('service_role', 'select * from orders')).rows.length, 1)
  assert.equal((await asRole('service_role', 'select * from cruise_members')).rows.length, 1)
  assert.equal((await asRole('service_role', 'select * from admin_audit_log')).rows.length, 1)
  await asRole('service_role', "insert into admin_audit_log values ('{}')")
  await asRole('service_role', 'insert into posts values (3,false)')
  assert.equal((await asRole('service_role', 'select fulfill_stripe_checkout_session() as value')).rows[0].value, 1)
  for (const name of ['exec_sql', 'execute_sql', 'run_sql']) {
    assert.equal((await asRole('service_role', `select ${name}('select 1') as value`)).rows[0].value, 1)
  }
})
