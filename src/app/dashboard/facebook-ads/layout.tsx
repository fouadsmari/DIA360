'use client'

import { FacebookAdsProvider } from '@/contexts/FacebookAdsContext'

export default function FacebookAdsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <FacebookAdsProvider>
      {children}
    </FacebookAdsProvider>
  )
}