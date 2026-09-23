import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getStripe } from '@/lib/stripe'
import { formatShippingLines } from '@/lib/shipping'
import { hasStudioAccess, studioCookieName } from '@/lib/studio-auth'
import { loadOrdersDashboard, type AttentionKind } from '@/lib/studio-orders'
import ReconcileButton from './ReconcileButton'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ATTENTION_LABEL: Record<AttentionKind, string> = {
  missing_address: 'Missing address',
  awaiting_delivery: 'Awaiting delivery',
  refund_check: 'Check refund',
  payment_sync: 'Payment sync',
  manual_hold: 'Manual hold',
  lapsed_hold: 'Lapsed hold',
}

const HOLD_LABEL = {
  checkout: 'Checkout in progress',
  lapsed: 'Checkout hold lapsed',
  manual: 'Manual hold',
} as const

function money(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100)
}

function when(iso: string) {
  return new Date(iso).toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' })
}

export default async function OrdersPage() {
  // Customer data: middleware already gates /studio, this also fails closed
  // if STUDIO_PASSWORD is ever missing in production.
  if (!hasStudioAccess(cookies().get(studioCookieName())?.value)) notFound()

  let data: Awaited<ReturnType<typeof loadOrdersDashboard>>
  try {
    data = await loadOrdersDashboard(createServiceRoleClient(), getStripe())
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load orders'
    return (
      <div style={{ padding: '2rem', color: '#E8176A', fontFamily: 'monospace' }}>
        <strong>Data source unavailable.</strong>
        <pre style={{ marginTop: '1rem', fontSize: '0.85rem' }}>{message}</pre>
      </div>
    )
  }

  return (
    <div className="ord">
      <style>{`
        .ord { padding: 24px 16px 64px; max-width: 960px; font-family: inherit; }
        .ord h1 { font-size: 1.4rem; margin: 0 0 4px; }
        .ord h2 { font-size: 0.8rem; letter-spacing: 0.14em; text-transform: uppercase; margin: 36px 0 12px; opacity: 0.7; }
        .ord .sub { font-size: 0.85rem; opacity: 0.7; margin: 0 0 16px; }
        .ord .cards { display: grid; gap: 10px; }
        .ord .card { border: 1px solid rgba(127,127,127,0.3); border-radius: 6px; padding: 12px 14px; }
        .ord .row { display: flex; flex-wrap: wrap; gap: 6px 14px; align-items: baseline; justify-content: space-between; }
        .ord .ttl { font-weight: 600; }
        .ord .meta { font-size: 0.8rem; opacity: 0.75; }
        .ord .tag { font-family: monospace; font-size: 0.68rem; letter-spacing: 0.08em; text-transform: uppercase; padding: 2px 6px; border-radius: 3px; border: 1px solid currentColor; }
        .ord .tag.warn { color: #C2410C; }
        .ord .tag.ok { color: #15803D; }
        .ord .tag.muted { opacity: 0.6; }
        .ord .addr { font-size: 0.85rem; margin-top: 8px; line-height: 1.45; }
        .ord .stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
        .ord .stat b { display: block; font-size: 1.5rem; }
        .ord .empty { font-size: 0.85rem; opacity: 0.7; }
        .ord a { color: inherit; }
      `}</style>

      <div className="row">
        <div>
          <h1>Orders</h1>
          <p className="sub">Payments, deliveries and inventory holds. Everything below is read live from Supabase and Stripe.</p>
        </div>
        <ReconcileButton />
      </div>

      <h2>Needs attention ({data.attention.length})</h2>
      {data.attention.length === 0 ? (
        <p className="empty">Nothing needs you right now.</p>
      ) : (
        <div className="cards">
          {data.attention.map((entry, index) => (
            <div className="card" key={`${entry.kind}-${index}`}>
              <div className="row">
                <span className="ttl">
                  {entry.slug ? <a href={`/items/${entry.slug}`} target="_blank" rel="noreferrer">{entry.title}</a> : entry.title}
                </span>
                <span className={`tag ${entry.kind === 'manual_hold' || entry.kind === 'lapsed_hold' ? 'muted' : 'warn'}`}>
                  {ATTENTION_LABEL[entry.kind]}
                </span>
              </div>
              <div className="meta">{entry.detail}</div>
            </div>
          ))}
        </div>
      )}

      <h2>Orders</h2>
      {data.orders.length === 0 ? (
        <p className="empty">No live orders yet.{data.testOrders ? ` (${data.testOrders} test-mode orders hidden.)` : ''}</p>
      ) : (
        <div className="cards">
          {data.orders.map(order => (
            <div className="card" key={order.id}>
              <div className="row">
                <span className="ttl">{order.item_title}</span>
                <span className={`tag ${order.status === 'paid' ? 'ok' : order.status === 'failed' ? 'warn' : 'muted'}`}>
                  {order.status}
                </span>
              </div>
              <div className="meta">
                {money(order.amount_total, order.currency)} · {when(order.created_at)} · {order.channel === 'elements' ? 'Embedded checkout' : 'Stripe Checkout'}
                {order.customer_name || order.customer_email ? ` · ${[order.customer_name, order.customer_email].filter(Boolean).join(' · ')}` : ''}
              </div>
              {order.status === 'paid' && (
                <div className="addr">
                  {order.shipping ? formatShippingLines(order.shipping).map(line => <div key={line}>{line}</div>) : <em>No delivery address on file.</em>}
                  <div className="meta" style={{ marginTop: 6 }}>
                    Delivery: {data.fulfillmentTracked ? order.fulfillment_status ?? 'unfulfilled' : 'not tracked yet'}
                    {order.tracking_number ? ` · Tracking ${order.tracking_number}` : ''}
                  </div>
                </div>
              )}
            </div>
          ))}
          {data.testOrders > 0 && <p className="empty">{data.testOrders} test-mode orders hidden.</p>}
        </div>
      )}

      <h2>Inventory</h2>
      <div className="stats">
        <div className="card stat"><b>{data.inventory.available}</b><span className="meta">Available: anyone can buy</span></div>
        <div className="card stat"><b>{data.inventory.reserved}</b><span className="meta">On hold: checkout in progress or held by you</span></div>
        <div className="card stat"><b>{data.inventory.sold}</b><span className="meta">Sold: paid, off the shop</span></div>
      </div>
      {data.holds.length > 0 && (
        <div className="cards" style={{ marginTop: 10 }}>
          {data.holds.map(hold => (
            <div className="card" key={hold.id}>
              <div className="row">
                <span className="ttl">{hold.title}</span>
                <span className="tag muted">{HOLD_LABEL[hold.kind]}</span>
              </div>
              <div className="meta">
                {hold.kind === 'checkout' && hold.until
                  ? `A buyer is paying. Comes back automatically after ${when(hold.until)} if they do not finish.`
                  : hold.kind === 'lapsed'
                    ? 'Released automatically once Stripe confirms the checkout cannot be paid.'
                    : 'Set by hand in Catalog. Never released automatically.'}
              </div>
            </div>
          ))}
        </div>
      )}

      <h2>Recovery history</h2>
      {data.recovery === null ? (
        <p className="empty">History starts once migration 20260923120000_order_fulfillment_fields.sql is applied. Until then, recoveries are logged in Vercel function logs.</p>
      ) : data.recovery.length === 0 ? (
        <p className="empty">No automatic repairs yet.</p>
      ) : (
        <div className="cards">
          {data.recovery.map((row, index) => (
            <div className="card" key={index}>
              <div className="row">
                <span className="ttl">{row.item_title ?? 'Order'}</span>
                <span className="tag muted">{row.action}</span>
              </div>
              <div className="meta">{when(row.created_at)} · {row.source}{row.reason ? ` · ${row.reason.replace(/_/g, ' ')}` : ''}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
