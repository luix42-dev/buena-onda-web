import { requireStudioPage } from '@/lib/supabase/studio'
import { redirect } from 'next/navigation'

export default async function StudioIndex() {
  await requireStudioPage()
  redirect('/studio/catalog')
}
