'use client'

import { useState } from 'react'
import { Crown, Check, AlertCircle, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const TIERS = [
  {
    id: 'professional',
    name: 'Professional',
    price: 999,
    setup: 2500,
    description: 'Para freelancers y profesionistas',
    features: [
      '1 persona física o moral',
      'Ingresos hasta $500K/mes',
      'Estrategia fiscal básica',
      'Cruce de CFDIs automático',
      'Tips de deducción de gastos',
      'Soporte por email',
    ],
  },
  {
    id: 'empresario',
    name: 'Empresario',
    price: 5300,
    setup: 5000,
    description: 'Para empresas en crecimiento',
    features: [
      '1 persona moral + 1 física',
      'Sin límite de ingresos',
      'Optimización fiscal avanzada',
      'Reportes mensuales y anuales',
      'Alertas de cumplimiento SAT',
      'Soporte prioritario',
    ],
    recommended: true,
  },
  {
    id: 'sovereign',
    name: 'Sovereign',
    price: 11000,
    setup: 15000,
    description: 'Ecosistema fiscal completo',
    features: [
      '5 morales + 10 físicos',
      'Planificación patrimonial',
      'Multi-jurisdicción',
      'Análisis de riesgo fiscal',
      'Asesor dedicado',
      'Soporte 24/7',
    ],
  },
]

export default function SubscriptionPage() {
  const [selectedTier, setSelectedTier] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async (tierId: string) => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/subscription/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tier: tierId,
          success_url: `${window.location.origin}/dashboard/subscription/success`,
          cancel_url: `${window.location.origin}/dashboard/subscription`
        })
      })

      if (response.ok) {
        const data = await response.json()
        window.location.href = data.checkout_url
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Suscripción</h1>
        <p className="text-zinc-400">Elige el plan que mejor se ajuste a tu negocio</p>
      </div>

      {/* Current plan banner */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-white" />
        <div>
          <p className="font-semibold text-white">Estás en período de prueba</p>
          <p className="text-sm text-zinc-400">Te quedan 48 horas de acceso completo. Suscríbete para continuar.</p>
        </div>
      </div>

      {/* Pricing cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {TIERS.map((tier) => (
          <div
            key={tier.id}
            className={`rounded-2xl p-6 border transition-all ${
              tier.recommended
                ? 'bg-zinc-900 border-white text-white'
                : 'bg-black border-zinc-800 text-white'
            }`}
          >
            {tier.recommended && (
              <div className="mb-4">
                <span className="inline-flex items-center rounded-full bg-white text-black px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase">
                  Recomendado
                </span>
              </div>
            )}
            
            <h3 className="text-lg font-bold text-white tracking-tight">
              {tier.name}
            </h3>
            <p className="mt-2 text-sm text-zinc-400">
              {tier.description}
            </p>
            
            <div className="mt-4">
              <span className="text-4xl font-black text-white">
                {formatCurrency(tier.price)}
              </span>
              <span className="text-sm text-zinc-500">
                /mes
              </span>
            </div>
            <p className="text-sm mt-1 text-zinc-600">
              Setup: {formatCurrency(tier.setup)}
            </p>

            <ul className="mt-6 space-y-3">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="h-5 w-5 flex-shrink-0 text-white" />
                  <span className="text-sm text-zinc-300">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe(tier.id)}
              disabled={loading}
              className={`mt-6 w-full py-2.5 rounded-md text-sm font-bold tracking-wide transition-colors ${
                tier.recommended
                  ? 'bg-white text-black hover:bg-zinc-200'
                  : 'border border-zinc-700 text-white hover:border-white'
              } disabled:opacity-50`}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              ) : (
                'Suscribirse'
              )}
            </button>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-white">Preguntas frecuentes</h3>
        </div>
        <div className="card-body space-y-4">
          <FAQItem
            question="¿Puedo cambiar de plan más adelante?"
            answer="Sí, puedes upgrade o downgrade tu suscripción en cualquier momento. Los cambios se aplican al siguiente ciclo de facturación."
          />
          <FAQItem
            question="¿Qué métodos de pago aceptan?"
            answer="Aceptamos tarjetas de crédito y débito (Visa, Mastercard, American Express) a través de Stripe."
          />
          <FAQItem
            question="¿Hay contrato de permanencia?"
            answer="No, todos nuestros planes son mensuales. Puedes cancelar en cualquier momento."
          />
          <FAQItem
            question="¿Qué incluye el costo de setup?"
            answer="El setup incluye la configuración inicial de tu empresa en el sistema, validación SAT y capacitación básica de uso."
          />
        </div>
      </div>
    </div>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div>
      <h4 className="font-medium text-white">{question}</h4>
      <p className="mt-1 text-sm text-zinc-400">{answer}</p>
    </div>
  )
}
