-- Studio uses a signed server cookie and the service role. A Supabase login is
-- NOT Studio authorization. Apply after the existing schema/migrations.
-- Idempotent; missing optional feature tables are skipped. No rows are changed.
begin;

do $$
declare
  table_name text;
  policy_row record;
  predicate text;
begin
  foreach table_name in array array[
    'posts', 'episodes', 'drops', 'media_assets', 'site_settings', 'themes',
    'items', 'item_images', 'timeline', 'events', 'transmission_issues',
    'cruise_scenes', 'cruise_channels', 'track_labels', 'player_tracks',
    'newsletter_subscribers', 'item_notify_requests', 'orders',
    'cruise_members', 'admin_audit_log',
    'checkout_recovery_log', 'intake_jobs', 'conversation_sessions',
    'cruise_plots', 'cruise_plot_events', 'cruise_plot_moderation',
    'cruise_plot_refunds_needed', 'cruise_plot_drive_by_seen'
  ] loop
    if to_regclass(format('public.%I', table_name)) is null then continue; end if;
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from public, anon, authenticated', table_name);
    execute format('grant all on table public.%I to service_role', table_name);
    -- Replace permissive legacy policies, including FOR ALL policies that also
    -- exposed drafts and customer email addresses to any authenticated account.
    for policy_row in select policyname from pg_policies
      where schemaname = 'public' and tablename = table_name
    loop
      execute format('drop policy %I on public.%I', policy_row.policyname, table_name);
    end loop;

    predicate := case
      when table_name in ('posts', 'episodes', 'themes', 'cruise_scenes', 'cruise_channels') then 'published = true'
      when table_name = 'items' then $p$status in ('published', 'sold_out', 'archived')$p$
      when table_name = 'item_images' then $p$exists (select 1 from public.items where items.id = item_images.item_id and items.status in ('published', 'sold_out', 'archived'))$p$
      when table_name = 'transmission_issues' then $p$status = 'live'$p$
      when table_name = 'site_settings' then $p$key in ('hero', 'social', 'contact', 'newsletter')$p$
      when table_name in ('drops', 'media_assets', 'timeline', 'events', 'track_labels') then 'true'
      else null
    end;
    if predicate is not null then
      execute format('grant select on table public.%I to anon, authenticated', table_name);
      execute format('create policy "Public website read" on public.%I for select to anon, authenticated using (%s)', table_name, predicate);
    end if;
  end loop;

  -- Views otherwise run with their owner's privileges and can bypass item RLS.
  if exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'item_primary_images' and c.relkind = 'v') then
    alter view public.item_primary_images set (security_invoker = true);
    revoke all on public.item_primary_images from public, anon, authenticated;
    grant select on public.item_primary_images to anon, authenticated, service_role;
  end if;
end $$;

-- Existing public media remains readable. Upload/delete require the authorized
-- server, including if another permissive storage policy is later added.
do $$ begin
  if to_regclass('storage.objects') is not null then
    drop policy if exists "Studio buckets server insert" on storage.objects;
    drop policy if exists "Studio buckets server update" on storage.objects;
    drop policy if exists "Studio buckets server delete" on storage.objects;
    create policy "Studio buckets server insert" on storage.objects as restrictive
      for insert to anon, authenticated with check (bucket_id not in ('images', 'audio', 'catalog'));
    create policy "Studio buckets server update" on storage.objects as restrictive
      for update to anon, authenticated using (bucket_id not in ('images', 'audio', 'catalog'))
      with check (bucket_id not in ('images', 'audio', 'catalog'));
    create policy "Studio buckets server delete" on storage.objects as restrictive
      for delete to anon, authenticated using (bucket_id not in ('images', 'audio', 'catalog'));
  end if;
end $$;

-- Revoke default PUBLIC execute on administrative RPCs (including older
-- installations that predate the checkout/Avenue grant fixes).
do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and (p.proname in ('fulfill_stripe_checkout_session', 'generate_catalog_number',
      'exec_sql', 'execute_sql', 'run_sql')
      or p.proname like 'cruise_plot_%')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.signature);
    execute format('grant execute on function %s to service_role', f.signature);
  end loop;
end $$;

commit;
