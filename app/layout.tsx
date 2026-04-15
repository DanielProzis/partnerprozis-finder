import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Partner Finder',
  description: 'Encontra parceiros de fitness em toda a Europa',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  )
}
