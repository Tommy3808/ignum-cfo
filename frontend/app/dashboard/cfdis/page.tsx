'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Receipt, Upload, Search, Filter, ArrowUpDown } from 'lucide-react'

const MOCK_CFDIS = [
  {
    id: 1,
    uuid: '12345678-1234-1234-1234-123456789abc',
    emisor: 'Proveedor Ejemplo S.A. de C.V.',
    rfc: 'ABC123456ABC',
    tipo: 'Ingreso',
    total: 15000.00,
    fecha: '2024-03-15',
    estado: 'Vigente',
    categoria: 'Gastos Generales'
  },
  {
    id: 2,
    uuid: '87654321-4321-4321-4321-cba987654321',
    emisor: 'Servicios Tecnológicos MX',
    rfc: 'STX987654XYZ',
    tipo: 'Egreso',
    total: 8500.00,
    fecha: '2024-03-14',
    estado: 'Vigente',
    categoria: 'Servicios Profesionales'
  },
]

export default function CFDIsPage() {
  const [filter, setFilter] = useState('')
  const [tipoFilter, setTipoFilter] = useState('all')

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CFDIs</h1>
          <p className="text-gray-600">Gestiona tus comprobantes fiscales</p>
        </div>
        <Link href="/dashboard/cfdis/upload" className="btn-primary">
          <Upload className="h-4 w-4 mr-2" />
          Subir CFDI
        </Link>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por RFC, emisor o UUID..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="input pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select 
                value={tipoFilter}
                onChange={(e) => setTipoFilter(e.target.value)}
                className="input"
              >
                <option value="all">Todos los tipos</option>
                <option value="ingreso">Ingreso</option>
                <option value="egreso">Egreso</option>
                <option value="nomina">Nómina</option>
              </select>
              <button className="btn-secondary">
                <Filter className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CFDI Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button className="flex items-center gap-1">
                    Fecha
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Emisor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {MOCK_CFDIS.map((cfdi) => (
                <tr key={cfdi.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(cfdi.fecha).toLocaleDateString('es-MX')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{cfdi.emisor}</p>
                      <p className="text-xs text-gray-500">{cfdi.rfc}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      cfdi.tipo === 'Ingreso' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {cfdi.tipo}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${cfdi.total.toLocaleString('es-MX')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {cfdi.categoria}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      {cfdi.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button className="text-indigo-600 hover:text-indigo-900 font-medium">
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {MOCK_CFDIS.length === 0 && (
          <div className="text-center py-12">
            <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No hay CFDIs</h3>
            <p className="text-gray-500 mt-2">Sube tu primera factura para comenzar</p>
            <Link href="/dashboard/cfdis/upload" className="btn-primary mt-4 inline-flex">
              <Upload className="h-4 w-4 mr-2" />
              Subir CFDI
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
