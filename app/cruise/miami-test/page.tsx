import { cookies } from 'next/headers'
import { hasCruiseStudioAccess, STUDIO_COOKIE } from '@/lib/cruise/studio-auth'
import StreetClient from './StreetClient'

export default async function Page() {
  const previewAuthorized = await hasCruiseStudioAccess((await cookies()).get(STUDIO_COOKIE)?.value)
  return <StreetClient previewAuthorized={previewAuthorized} />
}
