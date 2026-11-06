import { requireStudioPage } from '@/lib/supabase/studio'
import type { ReactNode } from 'react'
import Sidebar from '@/components/studio/Sidebar'
import { ToastProvider } from '@/components/studio/Toast'

export default async function StudioShellLayout({ children }: { children: ReactNode }) {
  await requireStudioPage()
  return (
    <ToastProvider>
      <div className="studio-shell">
        <Sidebar />
        <main className="main">{children}</main>
      </div>
    </ToastProvider>
  )
}
