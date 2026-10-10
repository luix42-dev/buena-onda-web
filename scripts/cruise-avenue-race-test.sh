#!/usr/bin/env bash
# Two-connection race test for cruise_plot_apply_claim (Stripe delivers the same webhook twice, concurrently).
# Throwaway local container only; never point this at a shared or production database.
# Usage: bash scripts/cruise-avenue-race-test.sh   (needs Docker; Git Bash on Windows is fine)
set -euo pipefail
export MSYS_NO_PATHCONV=1
NAME=cruise-lock-test
docker run -d --rm --name $NAME -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16-alpine >/dev/null
trap 'docker rm -f $NAME >/dev/null' EXIT
until docker exec $NAME pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done; sleep 2
docker exec $NAME psql -U postgres -qAt -c "create role anon nologin; create role authenticated nologin; create role service_role nologin;"
docker exec -i $NAME psql -U postgres -v ON_ERROR_STOP=1 -qAt < supabase/migrations/20261009120000_cruise_avenue_plots.sql
race() { # $1 session, $2 plot: delivery A holds its transaction 3 s; duplicate B arrives 1 s later.
  local C="select public.cruise_plot_apply_claim('$1',$2,500,0,'TEST Owner','TEST','https://example.test','#ff4f9a','test@example.test','usd')"
  ( docker exec $NAME psql -U postgres -qAt -c "begin; $C; select pg_sleep(3); commit;" | head -1 | sed 's/^/  A: /' ) &
  sleep 1; docker exec $NAME psql -U postgres -qAt -c "$C" | sed 's/^/  B: /'; wait
  docker exec $NAME psql -U postgres -qAt -c "select '  refunds_needed: '||count(*) from public.cruise_plot_refunds_needed where stripe_session_id='$1'"
}
echo "With the advisory lock (expected: A applied, B duplicate, 0 refunds):"; race cs_test_race_lock 7
docker exec $NAME psql -U postgres -qAt -c "select pg_get_functiondef('public.cruise_plot_apply_claim'::regproc)" | grep -v pg_advisory_xact_lock | docker exec -i $NAME psql -U postgres -qAt >/dev/null
echo "Control, lock removed (shows the bug: B stale_price, 1 false refund):"; race cs_test_race_nolock 8
