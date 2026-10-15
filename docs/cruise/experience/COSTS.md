# Operating cost scenarios

October 15, 2026. No new paid service, subscription, recognition trial, asset purchase or deployment was activated. This is not a billing-account audit. Existing hosting/storage/realtime charges and quotas were not inspected.

## Verified public list prices, not actual account charges

Vercel documents a USD 20/month Pro platform fee with one deploying seat and USD 20 usage credit; usage and extra seats/add-ons can increase the bill. [Official Vercel Pro plan](https://vercel.com/docs/plans/pro-plan).

Supabase documents Free and paid tiers; its billing FAQ lists USD 25 for Pro. Included credits/compute and extra projects or usage affect the final bill. [Official billing FAQ](https://supabase.com/docs/guides/platform/billing-faq), [billing overview](https://supabase.com/docs/guides/platform/billing-on-supabase).

No upgrade is proposed or authorized. Those price references were checked during this pass and can change.

## Explicit planning scenarios

| Scenario | Estimated fixed incremental monthly spend | Boundary |
| --- | ---: | --- |
| Local preview only | USD 0 new subscriptions | Existing machine/electricity/account charges excluded |
| Existing approved hosting/realtime with available quotas | Potentially USD 0 incremental | Not guaranteed; actual account/usage not audited |
| New one-seat Vercel Pro, existing eligible Supabase tier | About USD 20 before usage/tax | Hypothetical, not needed or activated by this branch |
| New Vercel Pro plus Supabase Pro | About USD 45 combined starting subscription fees before usage/tax | Hypothetical small-pilot baseline, excludes extra projects/seats/compute/licensing |

The USD 20-45 scenarios are arithmetic from public base prices, not a quote or production budget cap. Commercial station/metadata licensing, domains, labor, content assets, paid recognition and high bandwidth are additional unknowns. Existing provider spend can make incremental cost very different.

For an illustrative 100 listeners/day, 10 minutes each, over 30 days: 500 listener-hours/month. At 128 kbit/s, direct audio is about 28.8 GB/month delivered by station providers; Cruise does not proxy or record it. A 20-second metadata interval is about 90,000 same-origin requests before shared caching effects. Presence 15-second heartbeats would produce roughly 120,000 track calls if all those listening hours opted in; delivered/billable realtime messages depend on concurrent-session fanout and provider accounting, so track calls are not an invoice estimate. Scene transfer needs actual cold asset/traffic measurements and cache reuse; no unsupported GB or dollar figure assigned.

Local diagnostics/report/postcards/feedback have no new server collector or storage service. No AudD token/trial/request was activated; any future recognition requires separate permission and a fresh official pricing/terms check. Real station permissions remain a launch gate independent of technical reachability.
