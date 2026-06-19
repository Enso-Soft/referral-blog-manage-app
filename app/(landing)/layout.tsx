'use client'

import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { LanguageProvider } from '@/components/landing/LanguageProvider'

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        {children}
      </LanguageProvider>
    </ThemeProvider>
  )
}
