'use client'

import { Providers } from '@/components/layout/Providers'
import { Header } from '@/components/layout/Header'

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Providers>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-[padding] duration-300 overflow-x-clip">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-6">
          {children}
        </main>
      </div>
    </Providers>
  )
}
