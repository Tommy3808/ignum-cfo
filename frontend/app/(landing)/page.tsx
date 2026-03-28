'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Calculator, Shield, Zap, Clock, CheckCircle, ChevronRight, Menu, X, Server, Cpu, Factory } from 'lucide-react'

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
      <nav className="fixed inset-x-0 top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link href="/" className="flex items-center gap-2">
                <div className="h-8 w-8 bg-[#1B5E20] rounded-lg flex items-center justify-center">
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
              <Link href="#infrastructure" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Infraestructura
              </Link>
              <Link href="#pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Precios
              </Link>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Iniciar sesión
              </Link>
              <Link href="/register" className="bg-[#1B5E20] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#2E7D32] transition-colors">
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
              <Link href="#infrastructure" className="block text-base font-medium text-gray-600">
                Infraestructura
              </Link>
              <Link href="#pricing" className="block text-base font-medium text-gray-600">
                Precios
              </Link>
              <hr className="border-gray-100" />
              <Link href="/login" className="block text-base font-medium text-gray-600">
                Iniciar sesión
              </Link>
              <Link href="/register" className="block bg-[#1B5E20] text-white text-center px-4 py-2 rounded-lg font-medium">
                Iniciar Demo
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section - With Infrastructure Background */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/infrastructure/h200-sxm5-141gb.jpg"
            alt="IGNUM Infrastructure"
            fill
            className="object-cover opacity-10"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white via-white/95 to-white"></div>
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1B5E20]/10 text-[#1B5E20] text-sm font-medium mb-8 border border-[#1B5E20]/20">
              <Server className="h-4 w-4" />
              <span>Powered by IGNUM Protocol</span>
              <span className="flex h-2 w-2 rounded-full bg-[#4CAF50] animate-pulse"></span>
            </div>

            <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-7xl mb-6">
              Tu CFO autónomo con{' '}
              <span className="text-[#1B5E20]">inteligencia soberana</span>
            </h1>
            <p className="text-xl leading-8 text-gray-600 mb-6 max-w-2xl mx-auto">
              Conexión directa al SAT mediante e.firma bajo bóveda criptográfica AES-256-GCM. 
              Calcula ISR, IVA y detecta fugas fiscales en tiempo real.
            </p>
            <p className="text-sm text-gray-500 mb-10">
              Desplegado desde nuestro campus de 15,000 m² en Cuadritos, Celaya con 7.3 MW de energía operacional.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register" className="bg-[#1B5E20] text-white text-lg px-8 py-4 rounded-xl font-semibold hover:bg-[#2E7D32] transition-all flex items-center shadow-lg shadow-[#1B5E20]/20">
                Probar gratis 72 horas
                <ChevronRight className="ml-2 h-5 w-5" />
              </Link>
              <Link href="#pricing" className="text-lg px-8 py-4 rounded-xl font-medium text-gray-700 hover:bg-gray-100 transition-colors border border-gray-200">
                Ver precios
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              Setup desde $2,500 · Sin tarjeta de crédito para demo
            </p>
          </div>
        </div>
      </section>

      {/* Infrastructure Section */}
      <section id="infrastructure" className="py-20 bg-gray-950 text-white relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/infrastructure/cuadritos-aerial.jpg"
            alt="Cuadritos Campus"
            fill
            className="object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/95 to-gray-950/80"></div>
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">
                Infraestructura de <span className="text-[#B87333]">grado soberano</span>
              </h2>
              <p className="text-gray-400 text-lg mb-8">
                Tu información fiscal nunca sale de jurisdicción mexicana. 
                Procesada en nuestros propios clústeres H200 con energía cogenerada in-situ.
              </p>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                  <Cpu className="h-8 w-8 text-[#B87333] mb-3" />
                  <div className="text-2xl font-bold">4×</div>
                  <div className="text-sm text-gray-400">NVIDIA H200 SXM5</div>
                </div>
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                  <Factory className="h-8 w-8 text-[#B87333] mb-3" />
                  <div className="text-2xl font-bold">7.3 MW</div>
                  <div className="text-sm text-gray-400">Energía operacional</div>
                </div>
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                  <Server className="h-8 w-8 text-[#B87333] mb-3" />
                  <div className="text-2xl font-bold">15K m²</div>
                  <div className="text-sm text-gray-400">Campus piloto</div>
                </div>
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                  <Shield className="h-8 w-8 text-[#B87333] mb-3" />
                  <div className="text-2xl font-bold">AES-256</div>
                  <div className="text-sm text-gray-400">Encriptación GCM</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="relative h-48 rounded-xl overflow-hidden">
                  <Image
                    src="/images/infrastructure/gas-pipeline.jpg"
                    alt="Pipeline de gas"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="relative h-32 rounded-xl overflow-hidden">
                  <Image
                    src="/images/infrastructure/cooling-infrastructure.jpg"
                    alt="Cooling"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
              <div className="space-y-4 pt-8">
                <div className="relative h-32 rounded-xl overflow-hidden">
                  <Image
                    src="/images/infrastructure/fiber-cabling.jpg"
                    alt="Fiber"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="relative h-48 rounded-xl overflow-hidden">
                  <Image
                    src="/images/infrastructure/server-corridor.jpg"
                    alt="Servers"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Tecnología que la competencia no tiene
            </h2>
            <p className="text-lg text-gray-600">
              Mientras otros usan APIs de terceros, nosotros procesamos tus CFDIs 
              en hierro propio con latencia de milisegundos.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<Shield className="h-6 w-6 text-[#1B5E20]" />}
              title="Bóveda FIEL"
              description="Tu e.firma se encripta en tu navegador antes de enviarse. Se desencripta solo en RAM durante milisegundos."
            />
            <FeatureCard
              icon={<Calculator className="h-6 w-6 text-[#1B5E20]" />}
              title="Cálculo en milisegundos"
              description="Cruce automático de IVA trasladado vs acreditable. Proyección de ISR diaria, no mensual."
            />
            <FeatureCard
              icon={<Zap className="h-6 w-6 text-[#1B5E20]" />}
              title="Motor Antifugas"
              description="Detecta PPD sin REP, facturas PUE a deudores crónicos, y proveedores en listas negras del SAT."
            />
            <FeatureCard
              icon={<Clock className="h-6 w-6 text-[#1B5E20]" />}
              title="Ledger Inmutable"
              description="Historial financiero con hash chain criptográfico. Imposible de alterar sin romper la cadena."
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Inversión en soberanía fiscal
            </h2>
            <p className="text-lg text-gray-600">
              El Setup es nuestro filtro de calidad. Trabajamos solo con empresas 
              que entienden el valor de la precisión absoluta.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl p-6 ${
                  tier.popular
                    ? 'bg-[#1B5E20] text-white ring-4 ring-[#1B5E20] ring-offset-4'
                    : 'bg-white border border-gray-200 hover:border-[#B87333] transition-colors'
                }`}
              >
                {tier.popular && (
                  <div className="mb-4">
                    <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
                      Más popular
                    </span>
                  </div>
                )}
                <h3 className={`text-lg font-semibold ${tier.popular ? 'text-white' : 'text-gray-900'}`}>
                  {tier.name}
                </h3>
                <p className={`mt-2 text-sm ${tier.popular ? 'text-green-100' : 'text-gray-500'}`}>
                  {tier.description}
                </p>
                <div className="mt-4">
                  <span className={`text-4xl font-bold ${tier.popular ? 'text-white' : 'text-gray-900'}`}>
                    {tier.price}
                  </span>
                  {tier.period && (
                    <span className={`text-sm ${tier.popular ? 'text-green-100' : 'text-gray-500'}`}>
                      {tier.period}
                    </span>
                  )}
                </div>
                {tier.setup !== '-' && (
                  <p className={`text-sm mt-1 ${tier.popular ? 'text-green-100' : 'text-gray-500'}`}>
                    Setup: <span className="font-semibold">{tier.setup}</span>
                  </p>
                )}
                <ul className="mt-6 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <CheckCircle className={`h-5 w-5 flex-shrink-0 ${tier.popular ? 'text-green-200' : 'text-[#1B5E20]'}`} />
                      <span className={`text-sm ${tier.popular ? 'text-green-50' : 'text-gray-600'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={tier.ctaLink}
                  className={`mt-6 block w-full text-center rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                    tier.popular
                      ? 'bg-white text-[#1B5E20] hover:bg-gray-100'
                      : 'bg-[#1B5E20] text-white hover:bg-[#2E7D32]'
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
      <section className="py-24 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/infrastructure/noc-control-room.jpg"
            alt="NOC"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1B5E20]/95 to-[#1B5E20]/80"></div>
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-4xl font-bold text-white mb-6">
              Deja de operar a ciegas
            </h2>
            <p className="text-xl text-green-100 mb-10">
              El 99% de empresas mexicanas dirigen su negocio mirando el espejo retrovisor. 
              Únete al 1% que tiene control absoluto.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="bg-white text-[#1B5E20] text-lg px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-colors shadow-xl"
              >
                Iniciar prueba gratuita
                <ChevronRight className="inline ml-2 h-5 w-5" />
              </Link>
              <span className="text-green-100 text-sm">
                Setup Empresario: $5,000 MXN
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 bg-[#1B5E20] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">I</span>
                </div>
                <span className="text-xl font-bold text-white">Ignum CFO</span>
              </div>
              <p className="text-gray-400 text-sm max-w-md">
                Sistema operativo fiscal soberano. Desplegado desde Cuadritos, Celaya 
                con 7.3 MW de infraestructura energética propia.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Producto</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="#features" className="hover:text-white">Funciones</Link></li>
                <li><Link href="#pricing" className="hover:text-white">Precios</Link></li>
                <li><Link href="#infrastructure" className="hover:text-white">Infraestructura</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="#" className="hover:text-white">Privacidad</Link></li>
                <li><Link href="#" className="hover:text-white">Términos</Link></li>
                <li><Link href="#" className="hover:text-white">Seguridad</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              © 2024 Ignum CFO · Un producto de IGNUM Protocol
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
              Sistema operativo soberano activo
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
      <div className="h-14 w-14 rounded-xl bg-[#1B5E20]/10 flex items-center justify-center mb-5">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  )
}
