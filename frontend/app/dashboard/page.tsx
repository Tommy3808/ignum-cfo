'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { 
  TrendingUp, 
  TrendingDown, 
  Receipt, 
  Calendar, 
  AlertCircle,
  ArrowRight,
  Loader2
} from 'lucide-react'

interface DashboardStats {
  totalIngresos: number
  totalEgresos: number
  ivaACargo: number
  isrACargo: number
  cfdiCount: number
  upcomingDeadlines: any[]
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Resumen de tu situación fiscal</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Ingresos del mes"
          value={stats?.totalIngresos || 0}
          trend="+12%"
          trendUp={true}
          icon={<TrendingUp className="h-5 w-5 text-green-600" />}
        />
        <StatCard
          title="Egresos del mes"
          value={stats?.totalEgresos || 0}
          trend="-5%"
          trendUp={false}
          icon={<TrendingDown className="h-5 w-5 text-red-600" />}
        />
        <StatCard
          title="IVA a cargo"
          value={stats?.ivaACargo || 0}
          subtitle="Por declarar"
          icon={<Receipt className="h-5 w-5 text-amber-600" />}
        />
        <StatCard
          title="ISR a cargo"
          value={stats?.isrACargo || 0}
          subtitle="Por declarar"
          icon={<Receipt className="h-5 w-5 text-blue-600" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Recommendations */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Recomendaciones IA</h3>
          </div>
          <div className="card-body space-y-4">
            <RecommendationItem
              type="warning"
              title="Fecha límite cercana"
              description="Tu declaración de IVA vence en 5 días."
              action="Ver detalles"
              actionHref="/dashboard/taxes"
            />
            <RecommendationItem
              type="tip"
              title="Optimización disponible"
              description="Podrías deducir $5,000 más en gastos médicos."
              action="Ver cómo"
              actionHref="/dashboard/assistant"
            />
            <RecommendationItem
              type="info"
              title="CFDI pendiente"
              description="Tienes 3 CFDIs sin categorizar."
              action="Categorizar"
              actionHref="/dashboard/cfdis"
            />
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Próximas fechas límite</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <DeadlineItem
                type="IVA"
                date="17 Abril 2024"
                daysLeft={12}
                description="Declaración mensual"
              />
              <DeadlineItem
                type="ISR"
                date="17 Abril 2024"
                daysLeft={12}
                description="Declaración mensual"
              />
              <DeadlineItem
                type="DIOT"
                date="20 Abril 2024"
                daysLeft={15}
                description="Declaración de operaciones"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">Acciones rápidas</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <QuickActionCard
              title="Subir CFDI"
              description="Registra nuevas facturas"
              href="/dashboard/cfdis/upload"
              icon={<Receipt className="h-6 w-6" />}
            />
            <QuickActionCard
              title="Calcular impuestos"
              description="Ver cálculo del mes"
              href="/dashboard/taxes"
              icon={<Calculator className="h-6 w-6" />}
            />
            <QuickActionCard
              title="Consultar IA"
              description="Habla con tu asesor fiscal"
              href="/dashboard/assistant"
              icon={<MessageSquare className="h-6 w-6" />}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper components
function StatCard({ title, value, subtitle, trend, trendUp, icon }: any) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(val)
  }

  return (
    <div className="card">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(value)}
            </p>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
            {trend && (
              <p className={`text-sm mt-2 ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
                {trend} vs mes anterior
              </p>
            )}
          </div>
          <div className="h-12 w-12 rounded-lg bg-gray-50 flex items-center justify-center">
            {icon}
          </div>
        </div>
      </div>
    </div>
  )
}

function RecommendationItem({ type, title, description, action, actionHref }: any) {
  const colors = {
    warning: 'bg-amber-50 border-amber-200',
    tip: 'bg-green-50 border-green-200',
    info: 'bg-blue-50 border-blue-200'
  }

  return (
    <div className={`p-4 rounded-lg border ${colors[type as keyof typeof colors]}`}>
      <div className="flex items-start gap-3">
        <AlertCircle className={`h-5 w-5 flex-shrink-0 ${
          type === 'warning' ? 'text-amber-600' :
          type === 'tip' ? 'text-green-600' : 'text-blue-600'
        }`} />
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{title}</h4>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
          <Link 
            href={actionHref}
            className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 mt-2 hover:text-indigo-700"
          >
            {action}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}

function DeadlineItem({ type, date, daysLeft, description }: any) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
          <Calendar className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <p className="font-medium text-gray-900">{type} - {description}</p>
          <p className="text-sm text-gray-500">{date}</p>
        </div>
      </div>
      <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${
        daysLeft <= 5 ? 'bg-red-100 text-red-700' :
        daysLeft <= 10 ? 'bg-amber-100 text-amber-700' :
        'bg-green-100 text-green-700'
      }`}>
        {daysLeft} días
      </div>
    </div>
  )
}

function QuickActionCard({ title, description, href, icon }: any) {
  return (
    <Link 
      href={href}
      className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
    >
      <div className="h-12 w-12 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
        {icon}
      </div>
      <div>
        <h4 className="font-medium text-gray-900">{title}</h4>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </Link>
  )
}

// Missing imports
import { Calculator, MessageSquare } from 'lucide-react'
