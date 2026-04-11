'use client'

import React, { useState, useEffect } from 'react'
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Shield,
  AlertCircle,
  Ban,
  FileText,
  DollarSign,
  Building2,
  Receipt,
  AlertOctagon
} from 'lucide-react'

interface LeakDetection {
  id: string
  tipo: 'LIQUIDEZ_PPD' | 'FALSA_UTILIDAD' | 'CONTAGIO_69B'
  nivel: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO'
  titulo: string
  descripcion: string
  monto_afectado: number
  rfc_afectado: string
  referencias: string[]
  accion_recomendada: string
  detectado_en: string
}

interface DashboardData {
  iva: {
    proyectado: number
    cobrado: number
    pagado: number
    a_cargo: number
  }
  isr: {
    estimado_30: number
    retenido: number
    a_cargo: number
  }
  flujo_fiscal: {
    entradas: number
    salidas: number
    balance: number
  }
  fugas: LeakDetection[]
}

const mockData: DashboardData = {
  iva: {
    proyectado: 45800.00,
    cobrado: 32400.00,
    pagado: 12800.00,
    a_cargo: 19600.00,
  },
  isr: {
    estimado_30: 85400.00,
    retenido: 12500.00,
    a_cargo: 72900.00,
  },
  flujo_fiscal: {
    entradas: 325000.00,
    salidas: 189000.00,
    balance: 136000.00,
  },
  fugas: [
    {
      id: 'leak_001',
      tipo: 'LIQUIDEZ_PPD',
      nivel: 'ALTO',
      titulo: 'IVA Secuestrado - PPD sin REP',
      descripcion: 'Tienes $45,800 de IVA "congelado" en facturas PPD sin REP después de 48h.',
      monto_afectado: 45800.00,
      rfc_afectado: 'ABC010101ABC',
      referencias: ['uuid-cfdi-1', 'uuid-cfdi-2'],
      accion_recomendada: 'Contactar cliente y solicitar REP inmediato',
      detectado_en: new Date().toISOString(),
    },
    {
      id: 'leak_002',
      tipo: 'FALSA_UTILIDAD',
      nivel: 'MEDIO',
      titulo: 'Falsa Utilidad - Cliente con historial moroso',
      descripcion: 'Emitiste PUE a cliente con >30 días de historial de pago tardío.',
      monto_afectado: 125000.00,
      rfc_afectado: 'XYZ020202XYZ',
      referencias: ['uuid-cfdi-3'],
      accion_recomendada: 'Bloquear PUE futuro para este cliente',
      detectado_en: new Date().toISOString(),
    },
    {
      id: 'leak_003',
      tipo: 'CONTAGIO_69B',
      nivel: 'CRITICO',
      titulo: 'Proveedor en Lista 69-B del SAT',
      descripcion: 'Uno de tus proveedores está en la lista de contribuyentes que presumiblemente realizan operaciones inexistentes.',
      monto_afectado: 87000.00,
      rfc_afectado: 'EMP030303EMP',
      referencias: ['uuid-cfdi-4', 'uuid-cfdi-5'],
      accion_recomendada: 'Congelar pagos y compilar dossier de defensa',
      detectado_en: new Date().toISOString(),
    },
  ]
}

const nivelColors = {
  BAJO: 'bg-zinc-700/40 border-zinc-500/50 text-zinc-300',
  MEDIO: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
  ALTO: 'bg-orange-500/20 border-orange-500/50 text-orange-400',
  CRITICO: 'bg-red-500/20 border-red-500/50 text-red-400 animate-pulse',
}

const tipoIcons = {
  LIQUIDEZ_PPD: TrendingDown,
  FALSA_UTILIDAD: AlertCircle,
  CONTAGIO_69B: Ban,
}

const tipoLabels = {
  LIQUIDEZ_PPD: 'Fuga de Liquidez',
  FALSA_UTILIDAD: 'Falsa Utilidad',
  CONTAGIO_69B: 'Contagio 69-B',
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2
  }).format(amount)
}

function MetricCard({ title, value, subtitle, trend, icon: Icon, color }: {
  title: string
  value: string
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
  icon: React.ElementType
  color: string
}) {
  return (
    <div
      
      
      className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm mb-1">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('500', '500/20')}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-1">
          {trend === 'up' ? (
            <TrendingUp className="w-4 h-4 text-green-400" />
          ) : trend === 'down' ? (
            <TrendingDown className="w-4 h-4 text-red-400" />
          ) : null}
          <span className={`text-xs ${trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400'}`}>
            {trend === 'up' ? '+12.5%' : trend === 'down' ? '-8.3%' : '0%'}
          </span>
          <span className="text-gray-500 text-xs">vs mes anterior</span>
        </div>
      )}
    </div>
  )
}

function LeakCard({ leak, onAction }: { leak: LeakDetection; onAction: (id: string, action: string) => void }) {
  const Icon = tipoIcons[leak.tipo]
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div
      
      
      
      className={`border rounded-xl overflow-hidden ${nivelColors[leak.nivel]}`}
    >
      <div
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-black/30">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-black/30">
                  {tipoLabels[leak.tipo]}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  leak.nivel === 'CRITICO' ? 'bg-red-500 text-white' : 'bg-black/30'
                }`}>
                  {leak.nivel}
                </span>
              </div>
              <h3 className="font-semibold mt-1">{leak.titulo}</h3>
              <p className="text-sm opacity-80 mt-1 line-clamp-2">{leak.descripcion}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg">{formatCurrency(leak.monto_afectado)}</p>
            <p className="text-xs opacity-60">Monto afectado</p>
          </div>
        </div>
      </div>

      
        {isExpanded && (
          <div
            
            
            
            className="border-t border-current border-opacity-20"
          >
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 opacity-60" />
                <span className="opacity-60">RFC:</span>
                <span className="font-mono">{leak.rfc_afectado}</span>
              </div>

              <div className="flex items-start gap-2 text-sm">
                <Receipt className="w-4 h-4 opacity-60 mt-0.5" />
                <div>
                  <span className="opacity-60">Referencias:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {leak.referencias.map((ref, i) => (
                      <span key={i} className="text-xs font-mono px-2 py-1 rounded bg-black/30">
                        {ref.slice(0, 16)}...
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-black/30">
                <p className="text-sm">
                  <span className="opacity-60">Acción recomendada:</span>
                  <br />
                  {leak.accion_recomendada}
                </p>
              </div>

              <div className="flex gap-2">
                {leak.nivel === 'CRITICO' && (
                  <button
                    onClick={() => onAction(leak.id, 'BLOCK')}
                    className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Ban className="w-4 h-4" />
                    Bloquear Pagos
                  </button>
                )}
                <button
                  onClick={() => onAction(leak.id, 'DOSSIER')}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Generar Dossier
                </button>
                <button
                  onClick={() => onAction(leak.id, 'ALERT')}
                  className="px-4 py-2 border border-current border-opacity-50 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <AlertOctagon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      
    </div>
  )
}

export function TaxDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'leaks' | 'ledger'>('overview')
  const [data, setData] = useState<DashboardData>(mockData)

  const handleLeakAction = (id: string, action: string) => {
    console.log(`Action ${action} on leak ${id}`)
    // Implementar llamada a API
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Ignum CFO</h1>
                <p className="text-xs text-gray-400">SOVEREIGN EDITION v2.0</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-green-400 font-medium">Ledger Verificado</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-zinc-700" />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 mt-6">
            {[
              { id: 'overview', label: 'Resumen Fiscal', icon: DollarSign },
              { id: 'leaks', label: 'Detección de Fugas', icon: AlertTriangle, badge: data.fugas.length },
              { id: 'ledger', label: 'Sovereign Ledger', icon: Shield },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 pb-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-white text-white'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
                {tab.badge && (
                  <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* IVA Section */}
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-zinc-300" />
                IVA Proyectado
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard
                  title="IVA Proyectado"
                  value={formatCurrency(data.iva.proyectado)}
                  subtitle="Basado en facturación PUE vs PPD"
                  trend="up"
                  icon={TrendingUp}
                  color="text-zinc-300"
                />
                <MetricCard
                  title="IVA Cobrado"
                  value={formatCurrency(data.iva.cobrado)}
                  subtitle="Efectivamente recibido"
                  icon={DollarSign}
                  color="text-green-400"
                />
                <MetricCard
                  title="IVA Pagado"
                  value={formatCurrency(data.iva.pagado)}
                  subtitle="A proveedores"
                  icon={TrendingDown}
                  color="text-red-400"
                />
                <MetricCard
                  title="IVA a Cargo"
                  value={formatCurrency(data.iva.a_cargo)}
                  subtitle="Por pagar este mes"
                  trend="up"
                  icon={AlertTriangle}
                  color="text-yellow-400"
                />
              </div>
            </div>

            {/* ISR Section */}
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-zinc-300" />
                ISR Estimado (Persona Moral 30%)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                  title="ISR Estimado"
                  value={formatCurrency(data.isr.estimado_30)}
                  subtitle="30% sobre utilidad estimada"
                  icon={Building2}
                  color="text-zinc-300"
                />
                <MetricCard
                  title="ISR Retenido"
                  value={formatCurrency(data.isr.retenido)}
                  subtitle="Por terceros"
                  icon={Receipt}
                  color="text-[#D4A574]"
                />
                <MetricCard
                  title="ISR a Cargo"
                  value={formatCurrency(data.isr.a_cargo)}
                  subtitle="Diferencia a pagar"
                  icon={AlertTriangle}
                  color="text-orange-400"
                />
              </div>
            </div>

            {/* Flujo Fiscal */}
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                Flujo de Efectivo Fiscal
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                  title="Entradas CFDI"
                  value={formatCurrency(data.flujo_fiscal.entradas)}
                  subtitle="Ingresos del período"
                  trend="up"
                  icon={TrendingUp}
                  color="text-green-400"
                />
                <MetricCard
                  title="Salidas CFDI"
                  value={formatCurrency(data.flujo_fiscal.salidas)}
                  subtitle="Egresos del período"
                  trend="down"
                  icon={TrendingDown}
                  color="text-red-400"
                />
                <MetricCard
                  title="Balance Fiscal"
                  value={formatCurrency(data.flujo_fiscal.balance)}
                  subtitle="Entradas - Salidas"
                  trend="up"
                  icon={DollarSign}
                  color="text-zinc-300"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'leaks' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                  Fugas Operativas Detectadas
                </h2>
                <p className="text-gray-400 mt-1">
                  Algoritmos autónomos detectaron {data.fugas.length} anomalías que requieren atención.
                </p>
              </div>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-red-500/20 border border-red-500/50 text-red-400 rounded-full text-sm">
                  {data.fugas.filter(f => f.nivel === 'CRITICO').length} Críticas
                </span>
                <span className="px-3 py-1 bg-orange-500/20 border border-orange-500/50 text-orange-400 rounded-full text-sm">
                  {data.fugas.filter(f => f.nivel === 'ALTO').length} Altas
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {data.fugas.map((leak) => (
                <LeakCard key={leak.id} leak={leak} onAction={handleLeakAction} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'ledger' && (
          <div className="text-center py-20">
            <Shield className="w-16 h-16 text-zinc-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Sovereign Ledger</h2>
            <p className="text-gray-400 max-w-md mx-auto">
              El ledger financiero append-only está verificado y sincronizado.
              Hash chain válida. Última verificación: hace 2 minutos.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-400 font-mono text-sm">
                Hash: a3f7...9e2d
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
