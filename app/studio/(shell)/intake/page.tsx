import { requireStudioPage } from '@/lib/supabase/studio'
import IntakeClient from './IntakeClient'

export const runtime = 'edge'

export const dynamic = 'force-dynamic'

export default async function IntakePage() {
  await requireStudioPage()
  return <IntakeClient />
}
