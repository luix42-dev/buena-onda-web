import { createServiceClient } from '@/lib/supabase/server'
import TransmissionClient from './TransmissionClient'

export const runtime = 'edge'

export const dynamic = 'force-dynamic'

type NewsletterSubscriber = {
  id: string
  email: string
  confirmed: boolean
  created_at: string
}

function TransmissionError({ message }: { message: string }) {
  return (
    <div style={{ padding: '2rem', color: '#E8176A', fontFamily: 'monospace' }}>
      <strong>Data source unavailable.</strong>
      <pre style={{ marginTop: '1rem', fontSize: '0.85rem' }}>{message}</pre>
    </div>
  )
}

async function loadTransmissionData() {
  try {
    const supabase = await createServiceClient()

    const [
      { data: issues, error: issuesError },
      { data: subscribers, error: subscribersError },
      { data: newsletterSetting, error: newsletterSettingError },
    ] = await Promise.all([
      supabase
        .from('transmission_issues')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('newsletter_subscribers')
        .select('id,email,confirmed,created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'newsletter')
        .maybeSingle(),
    ])
    if (issuesError) {
      console.error('[studio/transmission] Supabase issues error:', issuesError.message)
      return { error: issuesError.message }
    }
    if (subscribersError) {
      console.error('[studio/transmission] Supabase subscribers error:', subscribersError.message)
      return { error: subscribersError.message }
    }
    if (newsletterSettingError) {
      console.error('[studio/transmission] Supabase newsletter setting error:', newsletterSettingError.message)
      return { error: newsletterSettingError.message }
    }

    return {
      issues: issues ?? [],
      subscribers: subscribers ?? [],
      newsletterSetting: newsletterSetting?.value ?? null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to initialize Supabase client'
    console.error('[studio/transmission] Supabase client error:', message)
    return { error: message }
  }
}

export default async function TransmissionPage() {
  const { issues, subscribers, newsletterSetting, error } = await loadTransmissionData()
  if (error) return <TransmissionError message={error} />

  return (
    <TransmissionClient
      initialIssues={issues ?? []}
      initialSubscribers={subscribers ?? [] as NewsletterSubscriber[]}
      newsletterSetting={newsletterSetting}
    />
  )
}
