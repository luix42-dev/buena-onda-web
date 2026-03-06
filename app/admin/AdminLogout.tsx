'use client'

import { useRouter } from 'next/navigation'
import { adminLogout } from '@/lib/api/admin'

export default function AdminLogout() {
  const router = useRouter()

  const handleLogout = async () => {
    await adminLogout()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="archive-label text-[0.6rem] text-stone-grey hover:text-rose-magenta
                 transition-colors text-left"
    >
      Sign out
    </button>
  )
}
