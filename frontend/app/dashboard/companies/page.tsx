'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { Building2, Plus, Loader2, AlertCircle } from 'lucide-react'

interface CompanyForm {
  rfc: string
  razonSocial: string
  nombreComercial: string
  regimenFiscal: string
}

const REGIMENES = [
  { code: '626', name: 'RESICO - Régimen Simplificado de Confianza' },
  { code: '605', name: 'RIF - Régimen de Incorporación Fiscal' },
  { code: '601', name: 'General de Ley Personas Morales' },
  { code: '603', name: 'Personas Morales con Fines no Lucrativos' },
  { code: '605_sueldos', name: 'Sueldos y Salarios' },
]

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<CompanyForm>()

  useEffect(() => {
    fetchCompanies()
  }, [])

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/companies', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setCompanies(data)
      }
    } catch (error) {
      console.error('Error fetching companies:', error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: CompanyForm) => {
    setSubmitting(true)
    setError('')
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rfc: data.rfc.toUpperCase(),
          razon_social: data.razonSocial,
          nombre_comercial: data.nombreComercial,
          regimen_fiscal: data.regimenFiscal
        })
      })
      
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail || 'Error al crear empresa')
      }
      
      reset()
      setShowForm(false)
      fetchCompanies()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
          <p className="text-gray-600">Gestiona tus personas físicas y morales</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          Agregar empresa
        </button>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Nueva Empresa</h3>
          </div>
          <div className="card-body">
            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">RFC</label>
                  <input
                    {...register('rfc', { 
                      required: 'RFC requerido',
                      pattern: {
                        value: /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/i,
                        message: 'RFC inválido'
                      }
                    })}
                    placeholder="ABCD010101XXX"
                    className="mt-1 input uppercase"
                  />
                  {errors.rfc && (
                    <p className="mt-1 text-xs text-red-600">{errors.rfc.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Régimen Fiscal</label>
                  <select {...register('regimenFiscal', { required: 'Requerido' })} className="mt-1 input">
                    <option value="">Seleccionar...</option>
                    {REGIMENES.map(r => (
                      <option key={r.code} value={r.code}>{r.name}</option>
                    ))}
                  </select>
                  {errors.regimenFiscal && (
                    <p className="mt-1 text-xs text-red-600">{errors.regimenFiscal.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Razón Social</label>
                <input
                  {...register('razonSocial', { required: 'Requerido' })}
                  className="mt-1 input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Nombre Comercial (opcional)</label>
                <input
                  {...register('nombreComercial')}
                  className="mt-1 input"
                />
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {companies.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No hay empresas registradas</h3>
          <p className="text-gray-500 mt-2">Agrega tu primera empresa para comenzar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {companies.map((company: any) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>
      )}
    </div>
  )
}

function CompanyCard({ company }: { company: any }) {
  const getRegimenName = (code: string) => {
    const regimenes: Record<string, string> = {
      '626': 'RESICO',
      '605': 'RIF',
      '601': 'Personas Morales',
      '603': 'PM No Lucrativas',
      '605_sueldos': 'Sueldos',
    }
    return regimenes[code] || code
  }

  return (
    <Link href={`/dashboard/companies/${company.id}`} className="card hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{company.razon_social}</h3>
              <p className="text-sm text-gray-500">{company.rfc}</p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {getRegimenName(company.regimen_fiscal)}
          </span>
        </div>
        
        {company.nombre_comercial && (
          <p className="mt-4 text-sm text-gray-600">{company.nombre_comercial}</p>
        )}

        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {company.sat_certified ? (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <AlertCircle className="h-3 w-3" />
                SAT Verificado
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-amber-600">
                <AlertCircle className="h-3 w-3" />
                Pendiente verificación
              </span>
            )}
          </div>
          <span className="text-sm text-gray-400">
            Desde {new Date(company.created_at).toLocaleDateString('es-MX')}
          </span>
        </div>
      </div>
    </Link>
  )
}
