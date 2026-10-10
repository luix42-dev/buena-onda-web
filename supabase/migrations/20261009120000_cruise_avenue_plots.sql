-- The Avenue: claimable plots on the Buena Onda Cruise.
--
-- Ownership is written only by cruise_plot_apply_claim (called from the Stripe webhook with the
-- service role). New claims and buyouts land in review_state 'pending' and are not shown on the
-- street until a studio operator approves them (cruise_plot_moderate). Every moderation action is
-- written to cruise_plot_moderation. Paid sessions that cannot be applied (lost race, bad amount,
-- house plot) are recorded durably in cruise_plot_refunds_needed.
--
-- Drive-bys are an anonymous, unverified counter, deduped per salted daily client hash per plot.
-- No raw IP address or user agent is stored anywhere.

create table if not exists public.cruise_plots (
  number           int primary key check (number between 1 and 200),
  status           text not null default 'open' check (status in ('open','claimed','house')),
  owner_name       text check (char_length(owner_name) between 2 and 32),
  owner_tagline    text check (char_length(owner_tagline) <= 48),
  owner_url        text check (owner_url ~ '^https://' and char_length(owner_url) <= 200),
  owner_color      text check (owner_color ~ '^#[0-9a-fA-F]{6}$'),
  owner_email      text,
  value_cents      int not null default 0 check (value_cents >= 0),
  visits           bigint not null default 0,
  clicks           bigint not null default 0,
  -- none: never claimed · pending: paid, awaiting content review · approved: on the street · pulled: removed by an operator
  review_state     text not null default 'none' check (review_state in ('none','pending','approved','pulled')),
  approved         boolean generated always as (review_state = 'approved') stored,
  claim_session_id text,
  claimed_at       timestamptz,
  reviewed_at      timestamptz,
  updated_at       timestamptz not null default now()
);

create table if not exists public.cruise_plot_events (
  id                bigint generated always as identity primary key,
  plot              int not null references public.cruise_plots(number),
  type              text not null check (type in ('claimed','bought_out')),
  name              text not null,
  cents             int not null,
  stripe_session_id text unique not null,
  -- The ticker shows the name only once the claim's content has been approved.
  name_approved     boolean not null default false,
  at                timestamptz not null default now()
);

create table if not exists public.cruise_plot_moderation (
  id               bigint generated always as identity primary key,
  plot             int references public.cruise_plots(number),
  action           text not null check (action in ('approve','pull','restore','note','refund_resolved')),
  actor            text not null check (char_length(actor) between 1 and 80),
  reason           text check (char_length(reason) <= 500),
  claim_session_id text,
  at               timestamptz not null default now()
);
create index if not exists cruise_plot_moderation_plot_at on public.cruise_plot_moderation(plot, at desc);

create table if not exists public.cruise_plot_refunds_needed (
  id                bigint generated always as identity primary key,
  stripe_session_id text unique not null,
  plot              int,
  reason            text not null check (reason in ('stale_price','not_claimable','invalid_claim','amount_mismatch','currency_mismatch','processing_error')),
  amount_cents      int,
  currency          text,
  email             text,
  detail            text check (char_length(detail) <= 500),
  created_at        timestamptz not null default now(),
  resolved_at       timestamptz,
  resolved_by       text
);

create table if not exists public.cruise_plot_drive_by_seen (
  client_hash text not null check (char_length(client_hash) between 16 and 128),
  plot        int not null references public.cruise_plots(number),
  last_at     timestamptz not null default now(),
  primary key (client_hash, plot)
);
create index if not exists cruise_plot_drive_by_seen_last_at on public.cruise_plot_drive_by_seen(last_at);

alter table public.cruise_plots enable row level security;
alter table public.cruise_plot_events enable row level security;
alter table public.cruise_plot_moderation enable row level security;
alter table public.cruise_plot_refunds_needed enable row level security;
alter table public.cruise_plot_drive_by_seen enable row level security;
-- No public policies: the API reads with the service role and exposes only safe columns.
revoke all on public.cruise_plots, public.cruise_plot_events, public.cruise_plot_moderation,
  public.cruise_plot_refunds_needed, public.cruise_plot_drive_by_seen from anon, authenticated;

-- Seed rows: open plots 1 and 7–30; house plots 2–6 exist only so their drive-bys are counted.
-- House plots are never sold (cruise_plot_apply_claim refuses them).
insert into public.cruise_plots(number) select n from generate_series(1,1) n on conflict do nothing;
insert into public.cruise_plots(number, status) select n, 'house' from generate_series(2,6) n on conflict do nothing;
insert into public.cruise_plots(number) select n from generate_series(7,30) n where n <> 10 on conflict do nothing;
-- Plot 10 (ocean-side lamp flag at s=43) crosses the sightline to billboard #1: house-owned, not for sale.
insert into public.cruise_plots(number, status) values (10, 'house') on conflict do nothing;

-- Drive-bys: counts each plot at most once per client hash per p_window_minutes.
-- p_client_hash is an HMAC of (UTC day, IP, user agent) computed by the API; it rotates daily.
create or replace function public.cruise_plot_drive_bys(plot_numbers int[], p_client_hash text, p_window_minutes int default 30)
returns int language plpgsql security definer set search_path = public as $$
declare counted int;
begin
  if p_client_hash is null or char_length(p_client_hash) not between 16 and 128 then return 0; end if;
  with wanted as (
    select distinct x as plot from unnest(plot_numbers[1:30]) as x where x between 1 and 200
  ), fresh as (
    insert into public.cruise_plot_drive_by_seen as seen (client_hash, plot, last_at)
    select p_client_hash, w.plot, now() from wanted w join public.cruise_plots p on p.number = w.plot
    on conflict (client_hash, plot) do update set last_at = excluded.last_at
      where seen.last_at < now() - make_interval(mins => greatest(coalesce(p_window_minutes, 30), 1))
    returning seen.plot
  )
  update public.cruise_plots set visits = visits + 1 where number in (select plot from fresh);
  get diagnostics counted = row_count;
  -- Opportunistic cleanup: hashes rotate daily, so anything older than two days is dead weight.
  if random() < 0.02 then delete from public.cruise_plot_drive_by_seen where last_at < now() - interval '2 days'; end if;
  return counted;
end $$;

-- Durable "refund needed" record. Idempotent on the Stripe session id.
create or replace function public.cruise_plot_flag_refund(
  p_session_id text, p_plot int, p_reason text, p_cents int, p_currency text, p_email text, p_detail text
) returns text language plpgsql security definer set search_path = public as $$
begin
  insert into public.cruise_plot_refunds_needed(stripe_session_id, plot, reason, amount_cents, currency, email, detail)
  values (p_session_id, p_plot, p_reason, p_cents, p_currency, p_email, left(p_detail, 500))
  on conflict (stripe_session_id) do nothing;
  if found then return 'recorded'; end if;
  return 'duplicate';
end $$;

-- Applies a paid claim/buyout. Never raises for a permanent business outcome; it returns one of
--   applied · duplicate · stale_price · not_claimable · invalid_claim
-- and records a refund-needed row for every paid session it could not apply.
create or replace function public.cruise_plot_apply_claim(
  p_session_id text, p_plot int, p_paid_cents int, p_prior_value_cents int,
  p_owner_name text, p_owner_tagline text, p_owner_url text, p_owner_color text, p_email text,
  p_currency text default 'usd'
) returns text language plpgsql security definer set search_path = public as $$
declare current_value int; current_status text;
begin
  -- Serialize deliveries of the same session: a concurrent duplicate waits here, then sees the first
  -- delivery's committed event and returns 'duplicate' instead of flagging the winner for a refund.
  perform pg_advisory_xact_lock(hashtext('cruise_plot_session:' || p_session_id));
  if exists (select 1 from public.cruise_plot_events where stripe_session_id = p_session_id)
     or exists (select 1 from public.cruise_plot_refunds_needed where stripe_session_id = p_session_id) then
    return 'duplicate';
  end if;
  select value_cents, status into current_value, current_status from public.cruise_plots where number = p_plot for update;
  if not found or current_status = 'house' then
    perform public.cruise_plot_flag_refund(p_session_id, p_plot, 'not_claimable', p_paid_cents, p_currency, p_email, 'plot is not for sale');
    return 'not_claimable';
  end if;
  -- Someone else bought it between checkout start and payment: do not overwrite.
  if current_value <> p_prior_value_cents then
    perform public.cruise_plot_flag_refund(p_session_id, p_plot, 'stale_price', p_paid_cents, p_currency, p_email,
      format('plot value was %s, checkout expected %s', current_value, p_prior_value_cents));
    return 'stale_price';
  end if;
  begin
    update public.cruise_plots set status = 'claimed', owner_name = p_owner_name, owner_tagline = p_owner_tagline,
      owner_url = p_owner_url, owner_color = p_owner_color, owner_email = p_email, value_cents = p_paid_cents,
      review_state = 'pending', claim_session_id = p_session_id, reviewed_at = null, claimed_at = now(), updated_at = now()
    where number = p_plot;
    insert into public.cruise_plot_events(plot, type, name, cents, stripe_session_id)
    values (p_plot, case when current_status = 'claimed' then 'bought_out' else 'claimed' end, p_owner_name, p_paid_cents, p_session_id);
  exception when check_violation or not_null_violation or string_data_right_truncation then
    perform public.cruise_plot_flag_refund(p_session_id, p_plot, 'invalid_claim', p_paid_cents, p_currency, p_email, sqlerrm);
    return 'invalid_claim';
  end;
  return 'applied';
end $$;

-- Studio moderation. Returns ok · not_found · not_claimed · invalid_action · invalid_state · stale.
-- p_expected_session (optional) guards against approving content the operator has not seen:
-- if a buyout landed after the page loaded, the action is refused with 'stale'.
create or replace function public.cruise_plot_moderate(
  p_plot int, p_action text, p_actor text, p_reason text, p_expected_session text default null
) returns text language plpgsql security definer set search_path = public as $$
declare r public.cruise_plots%rowtype; next_state text;
begin
  if p_action not in ('approve','pull','restore','note') or coalesce(trim(p_actor), '') = '' then return 'invalid_action'; end if;
  select * into r from public.cruise_plots where number = p_plot for update;
  if not found or r.status = 'house' then return 'not_found'; end if;
  if p_action <> 'note' then
    if r.status <> 'claimed' then return 'not_claimed'; end if;
    if p_expected_session is not null and r.claim_session_id is distinct from p_expected_session then return 'stale'; end if;
    next_state := case
      when p_action = 'approve' and r.review_state = 'pending' then 'approved'
      when p_action = 'pull' and r.review_state in ('pending','approved') then 'pulled'
      when p_action = 'restore' and r.review_state = 'pulled' then 'approved'
    end;
    if next_state is null then return 'invalid_state'; end if;
    update public.cruise_plots set review_state = next_state, reviewed_at = now(), updated_at = now() where number = p_plot;
    update public.cruise_plot_events set name_approved = (next_state = 'approved') where stripe_session_id = r.claim_session_id;
  end if;
  insert into public.cruise_plot_moderation(plot, action, actor, reason, claim_session_id)
  values (p_plot, p_action, left(trim(p_actor), 80), nullif(left(trim(coalesce(p_reason, '')), 500), ''), r.claim_session_id);
  return 'ok';
end $$;

create or replace function public.cruise_plot_resolve_refund(p_session_id text, p_actor text, p_note text)
returns text language plpgsql security definer set search_path = public as $$
declare r public.cruise_plot_refunds_needed%rowtype;
begin
  if coalesce(trim(p_actor), '') = '' then return 'invalid_action'; end if;
  update public.cruise_plot_refunds_needed set resolved_at = now(), resolved_by = left(trim(p_actor), 80)
  where stripe_session_id = p_session_id and resolved_at is null returning * into r;
  if not found then return 'not_found'; end if;
  insert into public.cruise_plot_moderation(plot, action, actor, reason, claim_session_id)
  values ((select number from public.cruise_plots where number = r.plot), 'refund_resolved', left(trim(p_actor), 80),
          nullif(left(trim(coalesce(p_note, '')), 500), ''), p_session_id);
  return 'ok';
end $$;

revoke all on function public.cruise_plot_drive_bys(int[], text, int) from public, anon, authenticated;
revoke all on function public.cruise_plot_flag_refund(text, int, text, int, text, text, text) from public, anon, authenticated;
revoke all on function public.cruise_plot_apply_claim(text, int, int, int, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.cruise_plot_moderate(int, text, text, text, text) from public, anon, authenticated;
revoke all on function public.cruise_plot_resolve_refund(text, text, text) from public, anon, authenticated;
grant execute on function public.cruise_plot_drive_bys(int[], text, int) to service_role;
grant execute on function public.cruise_plot_flag_refund(text, int, text, int, text, text, text) to service_role;
grant execute on function public.cruise_plot_apply_claim(text, int, int, int, text, text, text, text, text, text) to service_role;
grant execute on function public.cruise_plot_moderate(int, text, text, text, text) to service_role;
grant execute on function public.cruise_plot_resolve_refund(text, text, text) to service_role;
