import type { Metadata, Viewport } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'
import { LanguageProvider } from '@/context/LanguageContext'

export const metadata: Metadata = {
  title: 'Dog Olympic Games',
  description: 'The official platform for Dog Olympic Games — competitions, rankings, teams and events.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Dog Olympic Games',
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
          <Navbar />
          <main style={{ paddingTop: 'var(--nav-height)' }}>
            {children}
          </main>
        </LanguageProvider>
      </body>
    </html>
  )
}