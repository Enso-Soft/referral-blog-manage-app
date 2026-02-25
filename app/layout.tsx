import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Enso Soft',
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
        {children}
      </body>
    </html>
  )
}
