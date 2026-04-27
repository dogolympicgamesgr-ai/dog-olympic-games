import type { Metadata, Viewport } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'
import { LanguageProvider } from '@/context/LanguageContext'
import PushProvider from '@/components/PushProvider'

export const metadata: Metadata = {
  title: 'CanAthlon',
  description: 'The official platform for CanAthlon — competitions, rankings, teams and events.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CanAthlon',
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0f1e',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="el">
      <body>
        <LanguageProvider>
          <PushProvider>
            <Navbar />
            <main style={{ paddingTop: 'var(--nav-height)' }}>
              {children}
            </main>
          </PushProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
