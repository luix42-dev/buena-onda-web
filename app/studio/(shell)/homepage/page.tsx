import SectionHead from '@/components/studio/SectionHead'
import { createServiceClient } from '@/lib/supabase/server'
import { getHeroImages } from '@/lib/getHeroImages'
import HomepageClient from './HomepageClient'

export const runtime = 'edge'

export const dynamic = 'force-dynamic'

type SiteSettingRow = {
  key: string
  value: Record<string, unknown>
  updated_at: string
}

async function loadHomepageData() {
  try {
    const supabase = await createServiceClient()
    const { data } = await supabase
      .from('site_settings')
      .select('key,value,updated_at')
      .in('key', ['hero', 'social', 'contact', 'newsletter'])

    return (data ?? []) as SiteSettingRow[]
  } catch {
    return []
  }
}

export default async function HomepageEditorPage() {
  const [siteSettings, heroPool] = await Promise.all([
    loadHomepageData(),
    Promise.resolve(getHeroImages()),
  ])

  const byKey = new Map(siteSettings.map(setting => [setting.key, setting.value]))
  const hero = byKey.get('hero') ?? {}
  const social = byKey.get('social') ?? {}
  const contact = byKey.get('contact') ?? {}
  const newsletter = byKey.get('newsletter') ?? {}

  return (
    <>
      <SectionHead
        title="Homepage"
        subtitle="Editable dashboard for the live homepage"
      />

      <HomepageClient
        heroPool={heroPool}
        hero={hero}
        social={social}
        contact={contact}
        newsletter={newsletter}
      />
    </>
  )
}
