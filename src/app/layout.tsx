import type { Metadata } from 'next'
import ClientProviders from './ClientProviders'
import './globals.css'

export const metadata: Metadata = {
  title: 'curatio',
  description: '읽은 것을 모으고 정리하고 공유하는 콘텐츠 큐레이션 서비스',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full bg-background text-on-surface antialiased">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  )
}
