import type { Metadata } from 'next'
import { Inter, Geist_Mono } from 'next/font/google'
import './globals.css'
import { StoreProvider } from '@/hooks/use-store'
import { ServiceWorkerRegistration } from '@/components/layout/ServiceWorkerRegistration'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Task Flow — Smart Task Planner',
  description:
    'Intelligent task scheduling with priority scoring, drag-to-reorder, and detailed analytics. Works offline. No account required.',
  manifest: '/manifest.json',
}

export const viewport = {
  themeColor: '#0f0f0f',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground font-sans">
        <StoreProvider>
          <ServiceWorkerRegistration />
          {children}
        </StoreProvider>
      </body>
    </html>
  )
}
