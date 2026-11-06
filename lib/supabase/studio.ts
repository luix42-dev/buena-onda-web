import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { hasStudioAccess, STUDIO_COOKIE } from '../studio-auth'

/** Call before any private server-page data read, independently of middleware. */
export async function requireStudioPage() {
  const cookieStore = await cookies()
  if (!(await hasStudioAccess(cookieStore.get(STUDIO_COOKIE)?.value))) {
    redirect('/studio/login')
  }
}
