# Remaining owner gate

Supabase access, schema migration, production Stripe configuration, deployment, and actual webhook delivery are complete. Production runs 3df7d11d0e821a127b0c72e55644fdbd6576eb9a.

One action remains: review the five item IDs in [inventory-reconciliation.json](inventory-reconciliation.json) and provide each disposition: unpaid and safe to release, paid with supporting payment evidence, or an intentional hold to retain. Four are archived reservation listings with no Order; one is a draft listing modified after its expired unpaid checkout. Online records do not establish manual/offline intent. All five remain unchanged.

Immediately after that evidence arrives, record classifications, apply only proven corrections with a current-state condition, re-query those IDs and the reserved count, and confirm no new checkout-created reservations. An intentional hold must be documented rather than silently treated as stale.

Only live processor credentials are available. Successful-payment fulfillment, replay safety, and non-null shipping persistence were verified through fixtures and real PostgreSQL; no real charge or production diagnostic inventory write was made. PayPal and cart do not exist and are not certified.

Rollback: do not revert only the app to 3983ae0. That version fulfills before persisting shipping, while the migrated RPC requires shipping first. A coordinated rollback would need the previous RPC definition (backed up locally in ignored .vercel/checkout-rpc-before.json), review of function permissions, and retention of all additive columns and Order/inventory data. It also restores old hold behavior. No rollback was executed; the repaired deployment remains active.
