import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/layout/Providers'
import { Header } from '@/components/layout/Header'

export const metadata: Metadata = {
  title: '블로그 콘텐츠 관리',
  description: '블로그 콘텐츠를 편집하고 관리합니다',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-[padding] duration-300 overflow-x-hidden">
            <Header />
            <main className="max-w-7xl mx-auto px-4 py-6">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
