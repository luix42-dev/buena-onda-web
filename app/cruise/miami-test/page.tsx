import { cookies } from 'next/headers'
import { hasCruiseStudioAccess, STUDIO_COOKIE } from '@/lib/cruise/studio-auth'
import StreetClient from './StreetClient'

export default async function Page() {
  const previewAuthorized = await hasCruiseStudioAccess(cookies().get(STUDIO_COOKIE)?.value)
  return <StreetClient previewAuthorized={previewAuthorized} />
}
