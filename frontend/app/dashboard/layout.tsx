'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  LayoutDashboard, 
  Building2, 
  Receipt, 
  Calculator, 
  MessageSquare, 
  Settings, 
  LogOut,
  Crown,
  AlertCircle
} from 'lucide-react'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200">
        <div className="flex h-16 items-center px-6 border-b border-gray-200">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">I</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Ignum CFO</span>
          </Link>
        </div>

        <nav className="p-4 space-y-1">
          <NavItem href="/dashboard" icon={<LayoutDashboard className="h-5 w-5" />}>
            Dashboard
          </NavItem>
          <NavItem href="/dashboard/companies" icon={<Building2 className="h-5 w-5" />}>
            Empresas
          </NavItem>
          <NavItem href="/dashboard/cfdis" icon={<Receipt className="h-5 w-5" />}>
            CFDIs
          </NavItem>
          <NavItem href="/dashboard/taxes" icon={<Calculator className="h-5 w-5" />}>
            Impuestos
          </NavItem>
          <NavItem href="/dashboard/assistant" icon={<MessageSquare className="h-5 w-5" />}>
            Asistente IA
          </NavItem>
          <NavItem href="/dashboard/subscription" icon={<Crown className="h-5 w-5" />}>
            Suscripción
          </NavItem>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <NavItem href="/dashboard/settings" icon={<Settings className="h-5 w-5" />}>
            Configuración
          </NavItem>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50"
          >
            <LogOut className="h-5 w-5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="pl-64">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
          <div>
            {/* Breadcrumbs would go here */}
          </div>
          <div className="flex items-center gap-4">
            <DemoAlert />
            <UserMenu />
          </div>
        </header>

        {/* Page content */}
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

function NavItem({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 hover:text-gray-900"
    >
      {icon}
      {children}
    </Link>
  )
}

function DemoAlert() {
  // This would check actual demo status from API
  const isDemo = true
  const hoursLeft = 48

  if (!isDemo) return null

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-800 rounded-md text-sm">
      <AlertCircle className="h-4 w-4" />
      <span>Demo: {hoursLeft}h restantes</span>
    </div>
  )
}

function UserMenu() {
  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <p className="text-sm font-medium text-gray-900">Usuario</p>
        <p className="text-xs text-gray-500">Demo</p>
      </div>
      <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
        <span className="text-sm font-medium text-indigo-700">U</span>
      </div>
    </div>
  )
}
