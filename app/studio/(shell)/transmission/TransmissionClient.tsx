'use client'

import { useState } from 'react'
import SectionHead from '@/components/studio/SectionHead'
import Drawer from '@/components/studio/Drawer'
import StatusPill from '@/components/studio/StatusPill'
import { useToast } from '@/components/studio/Toast'
import type { Post } from '@/types'

type Subscriber = {
  id: string
  email: string
  confirmed: boolean
  created_at: string
}

type Props = {
  initialPosts: Post[]
  initialSubscribers: Subscriber[]
  newsletterSetting: Record<string, unknown> | null
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'n/a'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function parseTags(raw: string) {
  return raw
    .split(',')
    .map(tag => tag.trim().toLowerCase())
    .filter(Boolean)
}

export default function TransmissionClient({
  initialPosts,
  initialSubscribers,
  newsletterSetting,
}: Props) {
  const toast = useToast()
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [subscribers] = useState<Subscriber[]>(initialSubscribers)
  const [composerOpen, setComposerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [body, setBody] = useState('')
  const [tags, setTags] = useState('')
  const [published, setPublished] = useState(false)

  const subscriberCount = subscribers.length
  const confirmedCount = subscribers.filter(s => s.confirmed).length
  const provider = typeof newsletterSetting?.provider === 'string' ? newsletterSetting.provider : 'unknown'
  const enabled = typeof newsletterSetting?.enabled === 'boolean' ? newsletterSetting.enabled : null

  const openComposer = () => {
    setTitle('')
    setExcerpt('')
    setBody('')
    setTags('')
    setPublished(false)
    setComposerOpen(true)
  }

  const saveIssue = async () => {
    if (!title.trim()) return
    setSaving(true)

    const res = await fetch('/api/admin/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        excerpt: excerpt.trim() || undefined,
        body: body.trim() || undefined,
        tags: parseTags(tags),
        published,
      }),
    })

    setSaving(false)

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast((err as { error?: string }).error ?? 'Could not save issue.')
      return
    }

    const saved = await res.json()
    setPosts(prev => [saved, ...prev])
    setComposerOpen(false)
    toast('Issue saved.')
  }

  return (
    <>
      <SectionHead
        title="The Transmission"
        subtitle="Slow mail, worth reading"
        actionLabel="+ Compose"
        onAction={openComposer}
      />

      <div className="hp">
        <div className="hpcard in">
          <div className="hk">Newsletter</div>
          <div className="hl">{subscriberCount} subscribers</div>
          <div className="hs">
            {confirmedCount} confirmed, {subscriberCount - confirmedCount} unconfirmed. Provider: {provider}
            {enabled === null ? '' : enabled ? ' and enabled.' : ' and disabled.'}
          </div>
          <div className="hb">
            <span className="hvis">Backed by `newsletter_subscribers`</span>
            <span className="hvis">Live data only</span>
          </div>
        </div>

        <div className="hpcard in">
          <div className="hk">Compose</div>
          <div className="hl">Issue composer wired</div>
          <div className="hs">
            This uses the existing `posts` model as the editorial issue ledger. There is no separate
            `transmission_issues` table yet, so Compose writes to the current post API.
          </div>
          <div className="hb">
            <span className="hvis">No migration required</span>
            <button type="button" className="btn" onClick={openComposer}>
              + Compose
            </button>
          </div>
        </div>
      </div>

      <div className="rows">
        <div className="row" style={{ borderTop: '1px solid var(--line)' }}>
          <div className="num">#</div>
          <div className="rmain">
            <div className="rttl">Issue / Subscriber</div>
          </div>
          <div className="rmeta">
            <div className="rdate">Status</div>
            <div className="rdate">Date</div>
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="empty" style={{ gridColumn: '1 / -1' }}>
            <div className="em-t">No issues yet.</div>
            <div className="em-s">Compose a post to seed the transmission archive.</div>
          </div>
        ) : (
          posts.map((post, index) => (
            <div key={post.id} className="row in">
              <div className="plnum">{String(index + 1).padStart(2, '0')}</div>
              <div className="rmain">
                <div className="rttl">{post.title}</div>
                <div className="rdek">
                  {post.excerpt ?? 'No excerpt yet.'}
                </div>
              </div>
              <div className="rmeta">
                <StatusPill variant={post.published ? 'published' : 'draft'} inline rowStyle />
                <div className="rdate">{formatDate(post.published_at ?? post.created_at)}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="rows" style={{ marginTop: 18 }}>
        <div className="row" style={{ borderTop: '1px solid var(--line)' }}>
          <div className="num">@</div>
          <div className="rmain">
            <div className="rttl">Newsletter subscribers</div>
          </div>
          <div className="rmeta">
            <div className="rdate">Confirmed</div>
            <div className="rdate">Joined</div>
          </div>
        </div>

        {subscribers.length === 0 ? (
          <div className="empty" style={{ gridColumn: '1 / -1' }}>
            <div className="em-t">No subscribers yet.</div>
            <div className="em-s">The list will appear here once subscribers start coming in.</div>
          </div>
        ) : (
          subscribers.map((subscriber) => (
            <div key={subscriber.id} className="row in">
              <div className="plnum">@</div>
              <div className="rmain">
                <div className="rttl">{subscriber.email}</div>
                <div className="rdek">Subscriber ID {subscriber.id}</div>
              </div>
              <div className="rmeta">
                <StatusPill variant={subscriber.confirmed ? 'published' : 'draft'} inline rowStyle />
                <div className="rdate">{formatDate(subscriber.created_at)}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <Drawer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        title="Compose issue"
        footer={(
          <>
            <button type="button" className="btn ghost" onClick={() => setComposerOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn coral" onClick={saveIssue} disabled={saving || !title.trim()}>
              {saving ? 'Saving...' : 'Save issue'}
            </button>
          </>
        )}
      >
        <div className="field">
          <label htmlFor="tx-title">Title</label>
          <input
            id="tx-title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Issue title"
          />
        </div>

        <div className="field">
          <label htmlFor="tx-excerpt">Excerpt</label>
          <textarea
            id="tx-excerpt"
            rows={3}
            value={excerpt}
            onChange={e => setExcerpt(e.target.value)}
            placeholder="Short blurb for the issue list"
          />
        </div>

        <div className="field">
          <label htmlFor="tx-body">Body</label>
          <textarea
            id="tx-body"
            rows={8}
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Draft the issue here"
          />
        </div>

        <div className="field">
          <label htmlFor="tx-tags">Tags</label>
          <input
            id="tx-tags"
            type="text"
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="mail, radio, miami"
          />
        </div>

        <div className="field">
          <label htmlFor="tx-published">Publish now</label>
          <input
            id="tx-published"
            type="checkbox"
            checked={published}
            onChange={e => setPublished(e.target.checked)}
          />
        </div>
      </Drawer>
    </>
  )
}
