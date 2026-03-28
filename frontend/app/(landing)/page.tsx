'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calculator, Shield, Zap, Clock, CheckCircle, ChevronRight, Menu, X } from 'lucide-react'

const PRICING_TIERS = [
  {
    name: 'Demo',
    price: 'Gratis',
    setup: '-',
    description: 'Prueba todas las funcionalidades',
    features: [
      'Acceso completo por 72 horas',
      'Subida de CFDIs ilimitada',
      'Cálculo de impuestos',
      'Asistente IA fiscal',
      '1 empresa',
    ],
    cta: 'Iniciar Demo',
    ctaLink: '/register?tier=demo',
    popular: false,
  },
  {
    name: 'Godinez',
    price: '$999',
    setup: '$2,500',
    period: '/mes',
    description: 'Para freelancers y profesionistas',
    features: [
      'Estrategia fiscal básica',
      'Cruce de CFDIs automático',
      'Tips de deducción de gastos',
      '1 persona física o moral',
      'Ingresos hasta $500K/mes',
      'Soporte por email',
    ],
    cta: 'Suscribirse',
    ctaLink: '/register?tier=godinez',
    popular: true,
  },
  {
    name: 'Empresario',
    price: '$5,300',
    setup: '$5,000',
    period: '/mes',
    description: 'Para empresas en crecimiento',
    features: [
      'Todas las funciones completas',
      'Optimización fiscal avanzada',
      '1 persona moral + 1 física',
      'Reportes mensuales y anuales',
      'Alertas de cumplimiento SAT',
      'Soporte prioritario',
    ],
    cta: 'Suscribirse',
    ctaLink: '/register?tier=empresario',
    popular: false,
  },
  {
    name: 'Sovereign',
    price: '$11,000',
    setup: '$15,000',
    period: '/mes',
    description: 'Ecosistema fiscal completo',
    features: [
      'Todo el plan Empresario',
      '5 morales + 10 físicos',
      'Planificación patrimonial',
      'Multi-jurisdicción',
      'Análisis de riesgo fiscal',
      'Asesor dedicado',
    ],
    cta: 'Contactar',
    ctaLink: '/register?tier=sovereign',
    popular: false,
  },
]

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="bg-white">
      {/* Navigation */}
      <nav className="fixed inset-x-0 top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link href="/" className="flex items-center gap-2">
                <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">I</span>
                </div>
                <span className="text-xl font-bold text-gray-900">Ignum CFO</span>
              </Link>
            </div>
            
            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Funciones
              </Link>
              <Link href="#pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Precios
              </Link>
              <Link href="#faq" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                FAQ
              </Link>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Iniciar sesión
              </Link>
              <Link href="/register" className="btn-primary">
                Iniciar Demo
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            <div className="px-4 py-4 space-y-3">
              <Link href="#features" className="block text-base font-medium text-gray-600">
                Funciones
              </Link>
              <Link href="#pricing" className="block text-base font-medium text-gray-600">
                Precios
              </Link>
              <Link href="#faq" className="block text-base font-medium text-gray-600">
                FAQ
              </Link>
              <hr className="border-gray-100" />
              <Link href="/login" className="block text-base font-medium text-gray-600">
                Iniciar sesión
              </Link>
              <Link href="/register" className="block btn-primary text-center">
                Iniciar Demo
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium mb-6">
              <span className="flex h-2 w-2 rounded-full bg-indigo-600"></span>
              Nueva versión 2024 - CFDI 4.0
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl mb-6">
              Tu contador fiscal con{' '}
              <span className="text-indigo-600">inteligencia artificial</span>
            </h1>
            <p className="text-lg leading-8 text-gray-600 mb-10">
              Automatiza tu contabilidad, calcula ISR, IVA y IEPS en segundos. 
              Cumple con SAT sin estrés y optimiza tu carga fiscal legalmente.
              <br />
              <strong>Desde $999/mes.</strong>
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register" className="btn-primary text-lg px-8 py-3">
                Probar gratis 72 horas
                <ChevronRight className="ml-2 h-5 w-5" />
              </Link>
              <Link href="#pricing" className="btn-secondary text-lg px-8 py-3">
                Ver precios
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              Sin tarjeta de crédito. Cancela cuando quieras.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl mb-4">
              Todo lo que necesitas para tu fiscalidad
            </h2>
            <p className="text-lg text-gray-600">
              Deja que la IA se encargue de los números. Tú enfócate en hacer crecer tu negocio.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<Calculator className="h-6 w-6 text-indigo-600" />}
              title="Cálculo automático"
              description="ISR, IVA e IEPS calculados al instante según tu régimen fiscal."
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6 text-indigo-600" />}
              title="Cumplimiento SAT"
              description="Validación de CFDIs y alertas de fechas límite de declaración."
            />
            <FeatureCard
              icon={<Zap className="h-6 w-6 text-indigo-600" />}
              title="Asesor IA 24/7"
              description="Resuelve dudas fiscales en segundos con nuestro experto en IA."
            />
            <FeatureCard
              icon={<Clock className="h-6 w-6 text-indigo-600" />}
              title="Ahorra tiempo"
              description="Reduce 90% del tiempo en contabilidad. Cruce automático de facturas."
            />
          </div>
        </div>
      </section>

      {/* Regimenes Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl mb-4">
              Soportamos todos los regímenes fiscales
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <RegimenCard
              title="RESICO"
              description="Régimen Simplificado de Confianza"
              features={["Personas Físicas", "Tasa variable 1-2.5%", "Hasta 3.5M anuales"]}
            />
            <RegimenCard
              title="RIF"
              description="Régimen de Incorporación Fiscal"
              features={["Personas Físicas", "Tasa 0-2.5%", "Hasta 2M anuales"]}
            />
            <RegimenCard
              title="Personas Morales"
              description="General de Ley"
              features={["Empresas", "Tasa 30% ISR", "Sin límite de ingresos"]}
            />
            <RegimenCard
              title="Sueldos"
              description="Asalariados"
              features={["Retenciones automáticas", "Declaración anual", "Deducciones personales"]}
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl mb-4">
              Planes transparentes
            </h2>
            <p className="text-lg text-gray-600">
              Sin costos ocultos. Elige el plan que se ajuste a tu negocio.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl p-6 ${
                  tier.popular
                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-600 ring-offset-2'
                    : 'bg-white border border-gray-200'
                }`}
              >
                {tier.popular && (
                  <div className="mb-4">
                    <span className="inline-flex items-center rounded-full bg-indigo-500 px-2.5 py-0.5 text-xs font-medium">
                      Más popular
                    </span>
                  </div>
                )}
                <h3 className={`text-lg font-semibold ${tier.popular ? 'text-white' : 'text-gray-900'}`}>
                  {tier.name}
                </h3>
                <p className={`mt-2 text-sm ${tier.popular ? 'text-indigo-100' : 'text-gray-500'}`}>
                  {tier.description}
                </p>
                <div className="mt-4">
                  <span className={`text-4xl font-bold ${tier.popular ? 'text-white' : 'text-gray-900'}`}>
                    {tier.price}
                  </span>
                  {tier.period && (
                    <span className={`text-sm ${tier.popular ? 'text-indigo-100' : 'text-gray-500'}`}>
                      {tier.period}
                    </span>
                  )}
                </div>
                {tier.setup !== '-' && (
                  <p className={`text-sm mt-1 ${tier.popular ? 'text-indigo-100' : 'text-gray-500'}`}>
                    Setup: {tier.setup}
                  </p>
                )}
                <ul className="mt-6 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <CheckCircle className={`h-5 w-5 flex-shrink-0 ${tier.popular ? 'text-indigo-200' : 'text-indigo-600'}`} />
                      <span className={`text-sm ${tier.popular ? 'text-indigo-100' : 'text-gray-600'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={tier.ctaLink}
                  className={`mt-6 block w-full text-center rounded-md px-4 py-2 text-sm font-medium ${
                    tier.popular
                      ? 'bg-white text-indigo-600 hover:bg-indigo-50'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="bg-indigo-600 rounded-3xl px-6 py-16 sm:px-16 sm:py-20 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl mb-6">
              ¿Listo para dejar de preocuparte por los impuestos?
            </h2>
            <p className="text-lg text-indigo-100 mb-8 max-w-2xl mx-auto">
              Únete a cientos de empresarios mexicanos que ya usan Ignum CFO. 
              Prueba gratis durante 72 horas, sin compromiso.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-md bg-white px-8 py-3 text-base font-medium text-indigo-600 hover:bg-indigo-50"
            >
              Iniciar prueba gratuita
              <ChevronRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">I</span>
              </div>
              <span className="text-xl font-bold text-white">Ignum CFO</span>
            </div>
            <p className="text-gray-400 text-sm">
              © 2024 Ignum CFO. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="h-12 w-12 rounded-lg bg-indigo-50 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  )
}

function RegimenCard({ title, description, features }: { title: string; description: string; features: string[] }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{description}</p>
      <ul className="space-y-2">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
            <CheckCircle className="h-4 w-4 text-indigo-600" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  )
}
