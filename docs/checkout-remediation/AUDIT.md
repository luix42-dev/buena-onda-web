# Checkout audit — 2026-10-01

Repository: `buena-onda-web`, baseline `3983ae013d9a09cbc89d51c6e298fddf45fae6f9`.
Actual inventory field is `items.availability`; `items.status` is publication state.
Historical `6d68c2a` exists and removed hosted checkout holds, but `3516f04` reintroduced them in both Stripe paths.

| Flow | Availability checked | Pre-payment status write | Successful-payment writer | Idempotent | Address collected | Address persisted |
|---|---|---|---|---|---|---|
| Stripe Hosted | `app/api/checkout/route.ts`: canonical item must be available | None; two checkout fixtures leave item available | Signed/mode-checked webhook → shared fulfillment → locked SQL RPC | Concurrent and distinct-event/same-session replays produce one paid Order and one email | Hosted `shipping_address_collection`; fixture verifies US setting | Actual webhook fixture → Supabase transport → PostgreSQL Order JSON; production column missing |
| Stripe Elements | `app/api/checkout/intent/route.ts`: canonical item must be available | None; intent fixture verifies unchanged inventory | Verified succeeded intent → same fulfillment RPC | Capture fixture replay produces one paid Order and one email | Shipping AddressElement shares Elements instance with PaymentElement | Processor `paymentIntent.shipping` fixture persists Order JSON; production column missing |
| PayPal | Absent | No PayPal runtime exists | Absent | Not applicable to existing code; not certified | Absent | Absent |

No cart provider, cart drawer, cart storage key, PayPal routes/SDK/configuration, or separate Customer table exists in `app`, `components`, or `lib`. The purchase surface is a one-item Buy Now button; customer fields live on Orders. Cart cleanup and PayPal acceptance tests are **not claimed as passing**. Adding either would be a new integration, not repairing an existing path.

Shipping UI behavior follows [Stripe's Address Element documentation](https://docs.stripe.com/elements/address-element/collect-addresses): the shared Elements instance supplies shipping during confirmation. The installed Stripe API version is `2025-02-24.acacia`; normalization also accepts `collected_information.shipping_details`. Tests exercise both response shapes.

`tests/checkout-payment.test.ts` executes real Next route handlers, signature verification, Supabase client serialization, and the migration's PostgreSQL RPC using PGlite. Only processor/HTTP transport is replaced. It checks canonical prices/names/SKUs, unavailable responses, processor failure, concurrent replay, sold-item collision logging, shipping-write failure/retry, missing address, amount/metadata mismatch, environment mismatch, and restricted RPC permissions. No payment or real email is sent.

Legacy reconciliation remains only for historical reservations. New holds and expired-session releases are removed. Catalog edits cannot set availability. The old blanket-release SQL is now read-only. `scripts/run-stripe-payment-intent.mjs` refuses live Stripe keys and non-local databases.

Production evidence is in `production-readonly.json`. Five reserved IDs were recorded before any mutation; none changed. Four have no Order; one has a canceled Order and expired unpaid session. Local processor history alone cannot prove absence of payments in the deployed account or invalidate a manual hold. All remain ambiguous.

Live homepage returned 200; Stripe webhook GET returned 405 and unsigned POST returned 400. These prove route presence/signature rejection only, **not processor delivery**. The accessible Stripe account lists no registered endpoints and no recent completion events. Production Stripe credentials are Vercel `sensitive`, cannot be decrypted, and cannot be compared to local credentials. Production database lacks shipping columns and exposes no SQL execution RPC. No diagnostic created a live checkout or changed inventory.

Deployment ordering: apply `20261001120000_checkout_payment_only.sql`, verify schema/RPC, then promote the repaired app. The migration adds the previously unapplied shipping fields/recovery log, requires shipping before fulfillment, fixes replay signaling, and restricts RPC execution to the service role. Do not deploy the new fulfillment handler to production before this prerequisite.
