import type { Metadata } from 'next'
import { Kanit } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'

const kanit = Kanit({ 
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  subsets: ['thai', 'latin'] 
})

export const metadata: Metadata = {
  title: 'Beer Station - POS & Stock System',
  description: 'Point of Sale system built with Next.js',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
      </head>
      <body className={kanit.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
