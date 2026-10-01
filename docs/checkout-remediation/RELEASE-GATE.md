# External release gate

Production rollout is blocked by database and processor access, not by a request for approval of the code.

Complete one access handoff: make a project-admin `SUPABASE_ACCESS_TOKEN` and a Stripe API credential for the **account used by the production deployment** available in the local environment. The existing local Stripe key cannot be compared with Vercel's non-readable sensitive value. Include test-mode access if processor-hosted payment testing is required. Do not place credentials in this document or commit them.

The pending database action is to execute the complete transaction in [`20261001120000_checkout_payment_only.sql`](../../supabase/migrations/20261001120000_checkout_payment_only.sql) against project `vkexbuvdimhdxbeonoxz`. The alternative to management API access is to run that exact file in [the project's SQL Editor](https://supabase.com/dashboard/project/vkexbuvdimhdxbeonoxz/sql/new). It changes schema/function permissions only and performs no inventory reconciliation updates.

Immediately after access is available:

1. Apply the tested migration and verify shipping columns plus the RPC's replay flag and service-role-only permission.
2. Verify which Stripe account production uses, inspect/register the correct webhook destination and subscriptions, and synchronize its signing secret through the existing Vercel environment workflow.
3. Deploy the repair branch through Vercel production and match its Git SHA. Confirm storefront, structured unavailable response, signature rejection, actual processor 2xx delivery, and replay behavior without a real charge or diagnostic inventory mutation.
4. Re-query the five reserved IDs in `production-readonly.json` against the correct account's complete payment history. If manual/offline payment evidence is needed, obtain it before changing that item. Record classification before any conditional update and re-query afterward.

Rollback: before production promotion, no production application rollback is needed. If promoted and a problem appears, use Vercel's previous production deployment `3983ae013d9a09cbc89d51c6e298fddf45fae6f9`; retain additive shipping/recovery columns and all Order/inventory data. The prior app reintroduces checkout holds, so rollback is containment, not acceptance of the target architecture.

No PayPal integration or cart exists in this repository. Those requested flows are not certified; creating a new PayPal/cart product surface is not represented by this Stripe repair.
