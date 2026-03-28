import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ignum CFO - Asistente Fiscal con IA para PyMEs Mexicanas',
  description: 'Automatiza tu contabilidad, calcula impuestos y optimiza tu estrategia fiscal con inteligencia artificial. Cumple con SAT sin estrés.',
}

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white">
      {children}
    </div>
  )
}
