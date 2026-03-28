import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'Ignum CFO - Asistente Fiscal con IA',
    template: '%s - Ignum CFO',
  },
  description: 'Automatiza tu contabilidad, calcula impuestos y optimiza tu estrategia fiscal con inteligencia artificial.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
