import { createServiceClient } from '@/lib/supabase/server'
import TransmissionClient from './TransmissionClient'

export const dynamic = 'force-dynamic'

type NewsletterSubscriber = {
  id: string
  email: string
  confirmed: boolean
  created_at: string
}

async function loadTransmissionData() {
  try {
    const supabase = await createServiceClient()

    const [{ data: issues }, { data: subscribers }, { data: newsletterSetting }] = await Promise.all([
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

    return {
      issues: issues ?? [],
      subscribers: subscribers ?? [],
      newsletterSetting: newsletterSetting?.value ?? null,
    }
  } catch {
    return { issues: [], subscribers: [] as NewsletterSubscriber[], newsletterSetting: null }
  }
}

export default async function TransmissionPage() {
  const { issues, subscribers, newsletterSetting } = await loadTransmissionData()

  return (
    <TransmissionClient
      initialIssues={issues}
      initialSubscribers={subscribers}
      newsletterSetting={newsletterSetting}
    />
  )
}
