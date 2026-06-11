import Navigation from '@/components/layout/Navigation'
import Footer from '@/components/layout/Footer'
import PersistentPlayer from '@/components/ui/PersistentPlayer'

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navigation />
      <main className="pb-16">{children}</main>
      <Footer />
      <PersistentPlayer />
    </>
  )
}
