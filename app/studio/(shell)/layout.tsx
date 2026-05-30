import type { ReactNode } from 'react'
import Sidebar from '@/components/studio/Sidebar'
import { ToastProvider } from '@/components/studio/Toast'

export default function StudioShellLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <div className="studio-shell">
        <Sidebar />
        <main className="main">{children}</main>
      </div>
    </ToastProvider>
  )
}
