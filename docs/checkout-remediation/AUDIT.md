# Checkout audit - 2026-10-01

Production repair: `3df7d11d0e821a127b0c72e55644fdbd6576eb9a`, merged in [PR #6](https://github.com/luix42-dev/buena-onda-web/pull/6). Inventory field is `items.availability`; `items.status` is publication state. Historical `6d68c2a` removed hosted checkout holds; `3516f04` reintroduced them in both Stripe paths.

| Flow | Availability checked | Pre-payment status write | Successful-payment writer | Idempotent | Address collected | Address persisted |
|---|---|---|---|---|---|---|
| Stripe Hosted | Canonical available item in app/api/checkout/route.ts; fixture and live 409 | None; repeated checkout fixtures leave inventory available | Signed/mode-checked webhook, shared fulfillment, locked SQL RPC | Concurrent and distinct-event/same-session fixtures produce one paid Order and one email | shipping_address_collection; fixture checks US setting | Webhook fixture through Supabase serialization into PostgreSQL Order JSON; production schema verified |
| Stripe Elements | Canonical available item in app/api/checkout/intent/route.ts | None; fixture verifies unchanged inventory | Verified succeeded intent through shared fulfillment RPC | Succeeded-intent replay fixture produces one paid Order and one email | AddressElement shares Elements instance with PaymentElement | paymentIntent.shipping fixture persists PostgreSQL Order JSON; production schema verified |
| PayPal | Absent | No PayPal runtime | Absent | Not applicable; not certified | Absent | Absent |

No cart provider, cart drawer, cart storage key, PayPal routes/SDK/configuration, or separate Customer table exists in app, components, or lib. The purchase surface is one-item Buy Now; customer fields live on Orders. Cart cleanup and PayPal checks are not claimed as passing. Adding either is a new integration.

Shipping follows [Stripe Address Element documentation](https://docs.stripe.com/elements/address-element/collect-addresses). The installed API version is 2025-02-24.acacia; normalization also accepts collected_information.shipping_details. Both response shapes are tested. No live paid Order was created; persistence proof is fixture execution against real PostgreSQL.

Tests execute actual Next handlers, signature verification, Supabase serialization, and the migration RPC through PGlite. Processor/HTTP transport is replaced. Coverage includes canonical pricing/name/SKU, unavailable items, processor failure, concurrent replay, sold-item collision logging, shipping-write retry, missing address, amount/metadata mismatch, environment mismatch, and RPC permissions. No payment or email is sent. Final local validation: 27/27 tests, typecheck, lint, and production build passed; seven unrelated existing lint warnings remain.

Runtime hold acquisition and expired-session release are removed. Catalog edits cannot set inventory availability. Legacy reconciliation requires processor evidence and prevents test-mode Orders authorizing changes to live inventory. The old blanket-release SQL is read-only. scripts/run-stripe-payment-intent.mjs refuses live keys and non-local databases.

Production migration 20261001120000_checkout_payment_only.sql was applied before deployment. database-migration-proof.json confirms shipping columns, replay result, and service-role-only RPC execution. The previous function is backed up locally in ignored .vercel/checkout-rpc-before.json. No inventory row changed during migration.

The supplied Stripe account is now the configured production account. The deployed public key previously contained an invalid 18-character value; the supplied key pair is now configured and the production bundle matches it. A signed webhook destination was registered at the canonical www URL; its secret was synchronized without committing it. See stripe-configuration-proof.json.

live-verification.json records the exact production SHA, homepage 200, webhook GET 405, unsigned POST 400, signed ignored-event replay 200, and structured unavailable checkout 409. Inventory and Order counts were unchanged. The www alias was checked against deployment dpl_Fryg8kArwMQRTd4fjXCNHs36AAnH. Production build is READY.

processor-delivery-proof.json independently records real Stripe delivery: a temporary customer.created subscription and synthetic customer without contact information or payment method produced an event whose pending_webhooks changed from 1 to 0. Stripe defines this field as deliveries not yet successfully acknowledged (for example, with a 20x response): [Event object](https://docs.stripe.com/api/events/object). The temporary customer was deleted and original payment-event subscriptions restored. This proves actual delivery to the production handler, not live paid fulfillment.

inventory-reconciliation.json records the post-deployment query: five reserved products, all unpublished, no changes. Four archived reservation listings have no Orders. One draft direct listing has a canceled Order and expired unpaid session, but its inventory was updated two days after checkout. Complete configured-account history contains four sessions and zero PaymentIntents. Online records cannot establish whether a manual hold or offline payment exists. All five require owner review.

No available-item payment session or live payment was created by diagnostics. No published/sold_out direct item was available for a live sold-product UI probe; that behavior remains code/fixture evidence. Processor-hosted payment testing requires test credentials and an isolated database. Earlier preview failures are superseded by production verification; historical evidence files retain their original timestamps.
