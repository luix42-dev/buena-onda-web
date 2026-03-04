'use client'

import { useRouter } from 'next/navigation'

export default function AdminLogout() {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' })
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
