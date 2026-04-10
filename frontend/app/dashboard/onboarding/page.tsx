'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Building2, Receipt, Calculator, ArrowRight } from 'lucide-react'

const STEPS = [
  { id: 'company', name: 'Agrega tu empresa', icon: Building2 },
  { id: 'cfdi', name: 'Sube tus facturas', icon: Receipt },
  { id: 'taxes', name: 'Revisa tus impuestos', icon: Calculator },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)

  const handleComplete = () => {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto w-full">
        <div className="text-center mb-8">
          <div className="h-16 w-16 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">¡Bienvenido a Ignum CFO!</h1>
          <p className="mt-2 text-gray-600">Completa estos pasos para configurar tu cuenta</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, idx) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center h-12 w-12 rounded-full ${
                  idx <= currentStep ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-400'
                }`}>
                  <step.icon className="h-6 w-6" />
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`h-1 w-24 mx-2 ${
                    idx < currentStep ? 'bg-zinc-900' : 'bg-zinc-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {STEPS.map((step) => (
              <span key={step.id} className="text-sm font-medium text-gray-600 w-32 text-center">
                {step.name}
              </span>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {currentStep === 0 && (
            <div className="text-center">
              <Building2 className="h-16 w-16 text-zinc-900 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Primero, registra tu empresa</h2>
              <p className="text-gray-600 mb-6">
                Necesitamos tu información fiscal para calcular tus impuestos correctamente.
              </p>
              <button
                onClick={() => router.push('/dashboard/companies')}
                className="btn-primary text-lg px-8"
              >
                Agregar empresa
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
            </div>
          )}

          {currentStep === 1 && (
            <div className="text-center">
              <Receipt className="h-16 w-16 text-zinc-900 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Sube tus facturas</h2>
              <p className="text-gray-600 mb-6">
                Carga tus CFDIs del mes para que podamos calcular tus impuestos automáticamente.
              </p>
              <button
                onClick={() => router.push('/dashboard/cfdis/upload')}
                className="btn-primary text-lg px-8"
              >
                Subir CFDIs
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
            </div>
          )}

          {currentStep === 2 && (
            <div className="text-center">
              <Calculator className="h-16 w-16 text-zinc-900 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Revisa tus impuestos</h2>
              <p className="text-gray-600 mb-6">
                Tu panel de impuestos está listo. Revisa el cálculo y las fechas límite.
              </p>
              <button
                onClick={handleComplete}
                className="btn-primary text-lg px-8"
              >
                Ir al dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        <div className="text-center mt-6">
          <button
            onClick={handleComplete}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Saltar por ahora →
          </button>
        </div>
      </div>
    </div>
  )
}
