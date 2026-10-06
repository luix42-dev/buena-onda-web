import CruiseSiteFrame from '@/components/cruise/CruiseSiteFrame'

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CruiseSiteFrame>{children}</CruiseSiteFrame>
  )
}
