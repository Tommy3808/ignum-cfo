'use client'

import { useState } from 'react'
import { Calculator, Calendar, FileText, AlertCircle } from 'lucide-react'

export default function TaxesPage() {
  const [selectedCompany, setSelectedCompany] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Impuestos</h1>
        <p className="text-gray-600">Cálculo y declaraciones fiscales</p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Empresa</label>
              <select 
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="mt-1 input"
              >
                <option value="">Seleccionar empresa...</option>
                <option value="1">Empresa Demo S.A. de C.V.</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Período</label>
              <input
                type="month"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="mt-1 input"
              />
            </div>
          </div>
        </div>
      </div>

      {selectedCompany && (
        <>
          {/* Tax Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <TaxCard
              title="ISR a Cargo"
              amount={12500}
              dueDate="17/04/2024"
              type="isr"
            />
            <TaxCard
              title="IVA a Cargo"
              amount={8400}
              dueDate="17/04/2024"
              type="iva"
            />
            <TaxCard
              title="Total a Pagar"
              amount={20900}
              dueDate="17/04/2024"
              type="total"
            />
          </div>

          {/* Calculation Detail */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Detalle del Cálculo</h3>
            </div>
            <div className="card-body">
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Ingresos</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Facturado</span>
                      <span className="font-medium">$125,000.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">IVA Trasladado</span>
                      <span className="font-medium">$20,000.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ISR Retenido</span>
                      <span className="font-medium text-red-600">-$2,500.00</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Egresos</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Gastos</span>
                      <span className="font-medium">$45,000.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">IVA Acreditable</span>
                      <span className="font-medium text-green-600">-$7,200.00</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-3">Resumen</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-lg">
                      <span className="text-gray-600">Utilidad Bruta</span>
                      <span className="font-semibold">$80,000.00</span>
                    </div>
                    <div className="flex justify-between text-lg">
                      <span className="text-gray-600">ISR (30%)</span>
                      <span className="font-semibold">$12,500.00</span>
                    </div>
                    <div className="flex justify-between text-lg">
                      <span className="text-gray-600">IVA a Cargo</span>
                      <span className="font-semibold">$8,400.00</span>
                    </div>
                    <div className="flex justify-between text-xl border-t pt-2">
                      <span className="font-medium text-gray-900">Total a Pagar</span>
                      <span className="font-bold text-zinc-900">$20,900.00</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button className="btn-primary">
              <FileText className="h-4 w-4 mr-2" />
              Generar declaración
            </button>
            <button className="btn-secondary">
              <Calculator className="h-4 w-4 mr-2" />
              Recalcular
            </button>
          </div>
        </>
      )}

      {!selectedCompany && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Selecciona una empresa</h3>
          <p className="text-gray-500 mt-2">Elige una empresa para ver el cálculo de impuestos</p>
        </div>
      )}
    </div>
  )
}

function TaxCard({ title, amount, dueDate, type }: { title: string; amount: number; dueDate: string; type: string }) {
  const colors = {
    isr: 'bg-blue-50 border-blue-200',
    iva: 'bg-zinc-50 border-zinc-200',
    total: 'bg-zinc-50 border-zinc-300'
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(val)
  }

  return (
    <div className={`rounded-lg p-6 border ${colors[type as keyof typeof colors]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(amount)}</p>
        </div>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
          type === 'isr' ? 'bg-blue-100 text-blue-600' :
          type === 'iva' ? 'bg-zinc-100 text-zinc-600' :
          'bg-zinc-900 text-white'
        }`}>
          {type === 'total' ? <Calculator className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm">
        <Calendar className="h-4 w-4 text-gray-400" />
        <span className="text-gray-600">Vence: {dueDate}</span>
      </div>
    </div>
  )
}
