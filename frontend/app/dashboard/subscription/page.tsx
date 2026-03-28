'use client'

import { useState } from 'react'
import { Crown, Check, AlertCircle, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const TIERS = [
  {
    id: 'godinez',
    name: 'Godinez',
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
        <h1 className="text-2xl font-bold text-gray-900">Suscripción</h1>
        <p className="text-gray-600">Elige el plan que mejor se ajuste a tu negocio</p>
      </div>

      {/* Current plan banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600" />
        <div>
          <p className="font-medium text-amber-900">Estás en período de prueba</p>
          <p className="text-sm text-amber-700">Te quedan 48 horas de acceso completo. Suscríbete para continuar.</p>
        </div>
      </div>

      {/* Pricing cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {TIERS.map((tier) => (
          <div
            key={tier.id}
            className={`rounded-2xl p-6 ${
              tier.recommended
                ? 'bg-indigo-600 text-white ring-4 ring-indigo-600 ring-offset-2'
                : 'bg-white border border-gray-200'
            }`}
          >
            {tier.recommended && (
              <div className="mb-4">
                <span className="inline-flex items-center rounded-full bg-indigo-500 px-2.5 py-0.5 text-xs font-medium">
                  Recomendado
                </span>
              </div>
            )}
            
            <h3 className={`text-lg font-semibold ${tier.recommended ? 'text-white' : 'text-gray-900'}`}>
              {tier.name}
            </h3>
            <p className={`mt-2 text-sm ${tier.recommended ? 'text-indigo-100' : 'text-gray-500'}`}>
              {tier.description}
            </p>
            
            <div className="mt-4">
              <span className={`text-4xl font-bold ${tier.recommended ? 'text-white' : 'text-gray-900'}`}>
                {formatCurrency(tier.price)}
              </span>
              <span className={`text-sm ${tier.recommended ? 'text-indigo-100' : 'text-gray-500'}`}>
                /mes
              </span>
            </div>
            <p className={`text-sm mt-1 ${tier.recommended ? 'text-indigo-100' : 'text-gray-500'}`}>
              Setup: {formatCurrency(tier.setup)}
            </p>

            <ul className="mt-6 space-y-3">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className={`h-5 w-5 flex-shrink-0 ${tier.recommended ? 'text-indigo-200' : 'text-indigo-600'}`} />
                  <span className={`text-sm ${tier.recommended ? 'text-indigo-100' : 'text-gray-600'}`}>
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe(tier.id)}
              disabled={loading}
              className={`mt-6 w-full py-2.5 rounded-md text-sm font-medium transition-colors ${
                tier.recommended
                  ? 'bg-white text-indigo-600 hover:bg-indigo-50'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
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
          <h3 className="text-lg font-semibold text-gray-900">Preguntas frecuentes</h3>
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
      <h4 className="font-medium text-gray-900">{question}</h4>
      <p className="mt-1 text-sm text-gray-600">{answer}</p>
    </div>
  )
}
