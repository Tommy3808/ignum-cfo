'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Calculator, Shield, Zap, Clock, CheckCircle, ChevronRight, Menu, X, Lock, Server, Cpu, MapPin } from 'lucide-react'

const PRICING_TIERS = [
  {
    name: 'Professional',
    price: 'Bespoke',
    setup: 'Evaluación',
    description: 'Arquitectura base para operadores individuales y consultores.',
    features: [
      'Ingesta de CFDIs automatizada',
      'Conciliación criptográfica SAT',
      'Monitoreo fiscal algorítmico',
      '1 entidad legal (Física o Moral)',
      'Auditoría continua de cumplimiento',
      'Soporte técnico preferencial',
    ],
    cta: 'Agendar Evaluación',
    ctaLink: '/register?tier=professional',
    popular: false,
  },
  {
    name: 'Enterprise',
    price: 'Bespoke',
    setup: 'Evaluación',
    period: '',
    description: 'Infraestructura robusta para corporativos en expansión.',
    features: [
      'Análisis avanzado de estrategia fiscal',
      'Reconciliación de facturación masiva',
      'Detección de anomalías en tiempo real',
      'Múltiples entidades legales',
      'Asignación de recursos dedicados',
      'Línea de soporte ejecutivo',
    ],
    cta: 'Solicitar Despliegue',
    ctaLink: '/register?tier=enterprise',
    popular: true,
  },
  {
    name: 'Sovereign',
    price: 'Private',
    setup: 'Bespoke',
    period: '',
    description: 'Bóveda aislada para Grupos Empresariales y Family Offices.',
    features: [
      'Hardware dedicado en IGNUM Campus',
      'Infraestructura Cold-Storage',
      'Consolidación fiscal multi-entidad',
      'Arquitectura de defensa patrimonial',
      'Análisis de riesgo y estrés fiscal',
      'Enlace directo con ingenieros de cuenta',
    ],
    cta: 'Revisión de Arquitectura',
    ctaLink: '/register?tier=sovereign_private',
    popular: false,
  },
]

const FEATURES = [
  {
    icon: Shield,
    title: 'Bóveda FIEL AES-256-GCM',
    description: 'Tu e.firma nunca toca nuestros servidores. Encriptación de grado militar con WebAuthn/Passkeys.',
    items: ['Encriptación end-to-end', 'WebAuthn / Passkeys', 'Sin passwords'],
  },
  {
    icon: Calculator,
    title: 'Cálculo Fiscal en Tiempo Real',
    description: 'ISR, IVA, IETU calculados automáticamente con cada CFDI. Sin sorpresas al cierre.',
    items: ['ISR automático', 'IVA en tiempo real', 'Retenciones'],
  },
  {
    icon: Zap,
    title: 'Detección de Fugas',
    description: 'IA que identifica gastos sin deducir, deducciones perdidas y oportunidades de ahorro.',
    items: ['Gastos sin deducir', 'Deducciones perdidas', 'Alertas proactivas'],
  },
  {
    icon: Clock,
    title: 'Conexión Directa SAT',
    description: 'Descarga automática de facturas emitidas y recibidas. Sincronización en minutos, no días.',
    items: ['Descarga automática', 'Cruce inteligente', 'Validación SAT'],
  },
]

const STATUS_METRICS = [
  { label: 'Uptime', value: '99.9%' },
  { label: 'CFDIs Procesados', value: '2.4M+' },
  { label: 'Tiempo Respuesta', value: '<50ms' },
]

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-[#2a2a2a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#D4A574] rounded-lg flex items-center justify-center font-bold text-[#0a0a0a]">I</div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm">Ignum CFO</span>
                <span className="text-[10px] text-gray-500">BY IGNUM PROTOCOL</span>
              </div>
            </Link>
            
            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Funciones</Link>
              <Link href="#technology" className="text-sm text-gray-400 hover:text-white transition-colors">Tecnología</Link>
              <Link href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Precios</Link>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Iniciar sesión</Link>
              <Link href="/register" className="bg-[#D4A574] text-[#0a0a0a] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#B8935F] transition-colors">
                Iniciar Demo
              </Link>
            </div>

            <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#2a2a2a] bg-[#0a0a0a] px-4 py-4 space-y-3">
            <Link href="#features" className="block text-gray-400">Funciones</Link>
            <Link href="#technology" className="block text-gray-400">Tecnología</Link>
            <Link href="#pricing" className="block text-gray-400">Precios</Link>
            <hr className="border-[#2a2a2a]" />
            <Link href="/login" className="block text-gray-400">Iniciar sesión</Link>
            <Link href="/register" className="block bg-[#D4A574] text-[#0a0a0a] text-center py-2 rounded-lg font-medium">Iniciar Demo</Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#D4A574]/50 text-[#D4A574] text-xs font-medium mb-6 bg-[#D4A574]/10">
                <span className="w-2 h-2 bg-[#D4A574] rounded-full animate-pulse"></span>
                <span>Powered by IGNUM Protocol</span>
              </div>

              <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-6">
                Infraestructura Financiera{' '}
                <span className="bg-gradient-to-r from-[#D4A574] to-[#E8C9A0] bg-clip-text text-transparent">
                  Soberana
                </span>
              </h1>
              
              <p className="text-lg text-gray-400 mb-4 max-w-lg">
                Conexión directa y automatizada al SAT bajo bóveda criptográfica AES-256-GCM. 
                Optimización fiscal en tiempo real para capital que exige control absoluto.
              </p>
              
              <p className="text-sm text-gray-500 mb-8">
                Desplegado desde nuestro campus privado de grado institucional con 7.3 MW de redundancia.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link href="/register" className="inline-flex items-center justify-center bg-[#D4A574] text-[#0a0a0a] px-8 py-4 rounded-xl font-semibold hover:bg-[#B8935F] transition-colors text-base">
                  Solicitar Auditoría Arquitectónica
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Link>
                <Link href="#pricing" className="inline-flex items-center justify-center border border-[#2a2a2a] bg-[#141414] text-white px-8 py-4 rounded-xl font-medium hover:border-[#D4A574] transition-colors text-base">
                  Modelos de Despliegue
                </Link>
              </div>

              <div className="flex items-center gap-6 mb-4 text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                  <Lock className="h-4 w-4 text-[#D4A574]" />
                  <span>Criptografía Militar</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Shield className="h-4 w-4 text-[#D4A574]" />
                  <span>Cumplimiento SAT Directo</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Cpu className="h-4 w-4 text-[#D4A574]" />
                  <span>Motor Cuentantitativo</span>
                </div>
              </div>

              <p className="text-xs text-gray-500">
                Acceso sujeto a evaluación de infraestructura
              </p>
            </div>

            {/* Terminal Mockup */}
            <div className="relative">
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden shadow-[0_0_40px_rgba(212,165,116,0.2)]">
                <div className="flex items-center gap-2 px-4 py-3 bg-[#111] border-b border-[#2a2a2a]">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-[#D4A574]"></div>
                  <span className="ml-4 text-xs text-gray-500 font-mono">ignum-cfo — bash</span>
                </div>
                <div className="p-6 font-mono text-sm min-h-[280px]">
                  <div className="text-[#D4A574] mb-2">$ ignum-cli init --fiscal-engine</div>
                  <div className="text-gray-400 mb-1">&gt; initializing_fiscal_engine...</div>
                  <div className="text-gray-400 mb-1">&gt; loading_sat_connector...</div>
                  <div className="text-gray-400 mb-1">&gt; encrypting_vault_aes256gcm...</div>
                  <div className="text-[#D4A574] mb-4">&gt; system_ready.</div>
                  <div className="text-[#D4A574]">$ <span className="animate-pulse">_</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Tecnología de <span className="bg-gradient-to-r from-[#D4A574] to-[#E8C9A0] bg-clip-text text-transparent">grado empresarial</span>
            </h2>
            <p className="text-lg text-gray-400">
              Construido sobre la misma infraestructura que procesa millones de transacciones en tiempo real.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {FEATURES.map((feature, idx) => (
              <div key={idx} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 hover:border-[#D4A574]/50 transition-colors group">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-[#D4A574]/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-[#D4A574]/20 transition-colors">
                    <feature.icon className="h-6 w-6 text-[#D4A574]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-gray-400 text-sm">{feature.description}</p>
                  </div>
                </div>
                <ul className="space-y-2 ml-16">
                  {feature.items.map((item, iidx) => (
                    <li key={iidx} className="flex items-center gap-2 text-sm text-gray-400">
                      <CheckCircle className="h-4 w-4 text-[#D4A574] flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology/Seguridad Section */}
      <section id="technology" className="py-24 bg-[#111]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold mb-6">
                Seguridad <span className="bg-gradient-to-r from-[#D4A574] to-[#E8C9A0] bg-clip-text text-transparent">de grado bancario</span>
              </h2>
              <p className="text-lg text-gray-400 mb-8">
                Tu información fiscal protegida con los más altos estándares de seguridad. 
                Encriptación AES-256-GCM y autenticación WebAuthn/Passkeys.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Lock, label: 'AES-256-GCM', desc: 'Encriptación militar' },
                  { icon: Shield, label: 'WebAuthn', desc: 'Sin passwords' },
                  { icon: Zap, label: 'En tiempo real', desc: 'Procesamiento 24/7' },
                  { icon: Cpu, label: 'IA Fiscal', desc: 'Entrenada para México' },
                ].map((item, idx) => (
                  <div key={idx} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
                    <item.icon className="h-6 w-6 text-[#D4A574] mb-2" />
                    <div className="font-semibold">{item.label}</div>
                    <div className="text-sm text-gray-500">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Card */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Estado del Sistema</h3>
                <div className="flex items-center gap-2 text-[#D4A574] text-sm">
                  <span className="w-2 h-2 bg-[#D4A574] rounded-full animate-pulse"></span>
                  Operacional
                </div>
              </div>

              <div className="space-y-4 mb-6">
                {[
                  { label: 'API SAT', status: 'Conectado', icon: Server },
                  { label: 'Bóveda FIEL', status: 'Activa', icon: Lock },
                  { label: 'Motor de IA', status: 'Operativo', icon: Cpu },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-[#111] rounded-lg">
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5 text-[#D4A574]" />
                      <span className="text-gray-300">{item.label}</span>
                    </div>
                    <span className="text-[#D4A574] font-mono text-sm">{item.status}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3 pt-6 border-t border-[#2a2a2a]">
                {STATUS_METRICS.map((metric, idx) => (
                  <div key={idx} className="text-center">
                    <div className="text-2xl font-bold font-mono">{metric.value}</div>
                    <div className="text-xs text-gray-500">{metric.label}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-[#2a2a2a] flex items-center gap-2 text-sm text-gray-500">
                <MapPin className="h-4 w-4 text-[#D4A574]" />
                <span>México · Infraestructura soberana</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Precios <span className="bg-gradient-to-r from-[#D4A574] to-[#E8C9A0] bg-clip-text text-transparent">transparentes</span>
            </h2>
            <p className="text-lg text-gray-400">
              Sin costos ocultos. Sin cargos sorpresa. Cancela cuando quieras.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PRICING_TIERS.map((tier, idx) => (
              <div
                key={idx}
                className={`relative rounded-xl p-6 ${
                  tier.popular
                    ? 'bg-[#1a1a1a] border-2 border-[#D4A574] scale-105 shadow-[0_0_30px_rgba(212,165,116,0.2)]'
                    : 'bg-[#1a1a1a] border border-[#2a2a2a]'
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-[#D4A574] text-[#0a0a0a] px-3 py-1 text-xs font-bold tracking-widest uppercase" style={{clipPath: 'polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)'}}>
                      Recomendado
                    </span>
                  </div>
                )}
                
                <h3 className="text-lg font-semibold text-center mb-1">{tier.name}</h3>
                <p className="text-gray-500 text-sm text-center mb-6">{tier.description}</p>
                
                <div className="text-center mb-2">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  {tier.period && <span className="text-gray-500">{tier.period}</span>}
                </div>
                {tier.setup !== '-' && (
                  <p className="text-center text-sm text-gray-500 mb-6">Setup: {tier.setup}</p>
                )}

                <ul className="space-y-3 mb-6">
                  {tier.features.map((feature, fidx) => (
                    <li key={fidx} className="flex items-start gap-2 text-sm text-gray-400">
                      <CheckCircle className="h-4 w-4 text-[#D4A574] flex-shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href={tier.ctaLink}
                  className={`block w-full text-center py-3 rounded-lg font-semibold transition-colors ${
                    tier.popular
                      ? 'bg-[#D4A574] text-[#0a0a0a] hover:bg-[#B8935F]'
                      : 'border border-[#2a2a2a] text-white hover:border-[#D4A574] hover:text-[#D4A574]'
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
      <section className="py-24 bg-[#111]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-5xl font-bold mb-6">
            Deja de <span className="bg-gradient-to-r from-[#D4A574] to-[#E8C9A0] bg-clip-text text-transparent">romantizar la mediocridad</span>
          </h2>
          <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto">
            Tu contador tiene 40 clientes. Ignum CFO tiene solo uno: tú. 
            24/7. Sin descanso. Sin excusas.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center bg-[#D4A574] text-[#0a0a0a] text-lg px-8 py-4 rounded-xl font-bold hover:bg-[#B8935F] transition-colors"
          >
            Iniciar demo gratuita
            <ChevronRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-[#0a0a0a] border-t border-[#2a2a2a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#D4A574] rounded-lg flex items-center justify-center font-bold text-[#0a0a0a]">I</div>
              <span className="text-gray-500 text-sm">
                © 2026 Ignum CFO. Un producto de IGNUM Protocol.
              </span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="https://ignumprotocol.ai" target="_blank" className="text-gray-500 hover:text-[#D4A574] text-sm transition-colors">
                IGNUM Protocol
              </Link>
              <Link href="/privacy" className="text-gray-500 hover:text-[#D4A574] text-sm transition-colors">
                Privacidad
              </Link>
              <Link href="/terms" className="text-gray-500 hover:text-[#D4A574] text-sm transition-colors">
                Términos
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
