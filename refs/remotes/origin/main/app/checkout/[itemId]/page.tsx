import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import TerminalCheckoutClient from '@/components/checkout/TerminalCheckoutClient'

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
}

interface Props {
  params: Promise<{ itemId: string }>
}

export default async function CheckoutPage({ params }: Props) {
  const { itemId } = await params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(itemId)) {
    notFound()
  }

  return <TerminalCheckoutClient itemId={itemId} />
}
