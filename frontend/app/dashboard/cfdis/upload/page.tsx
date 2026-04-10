'use client'

import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

export default function CFDIUploadPage() {
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [companyId, setCompanyId] = useState('')

  const onDrop = async (acceptedFiles: File[]) => {
    if (!companyId) {
      alert('Selecciona una empresa primero')
      return
    }

    setUploading(true)
    
    for (const file of acceptedFiles) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('company_id', companyId)
      
      try {
        const token = localStorage.getItem('token')
        const response = await fetch('/api/cfdi/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        })
        
        const result = await response.json()
        setResults(prev => [...prev, { file: file.name, ...result }])
      } catch (error) {
        setResults(prev => [...prev, { 
          file: file.name, 
          success: false, 
          error: 'Error al procesar' 
        }])
      }
    }
    
    setUploading(false)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/xml': ['.xml']
    }
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Subir CFDIs</h1>
        <p className="text-gray-600">Carga tus facturas en formato XML</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">Seleccionar Empresa</h3>
        </div>
        <div className="card-body">
          <select 
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="input"
          >
            <option value="">Selecciona una empresa...</option>
            {/* This would be populated from API */}
            <option value="1">Empresa Demo S.A. de C.V.</option>
          </select>
        </div>
      </div>

      <div 
        {...getRootProps()}
        className={`card border-2 border-dashed cursor-pointer transition-colors ${
          isDragActive ? 'border-zinc-900 bg-zinc-50' : 'border-gray-300'
        }`}
      >
        <div className="card-body text-center py-12">
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          {isDragActive ? (
            <p className="text-lg font-medium text-zinc-900">Suelta los archivos aquí...</p>
          ) : (
            <>
              <p className="text-lg font-medium text-gray-900">
                Arrastra CFDIs aquí o haz clic para seleccionar
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Archivos XML de CFDI 4.0
              </p>
            </>
          )}
        </div>
      </div>

      {uploading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-900 mr-3" />
          <span className="text-gray-600">Procesando CFDIs...</span>
        </div>
      )}

      {results.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Resultados</h3>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              {results.map((result, idx) => (
                <div 
                  key={idx}
                  className={`p-4 rounded-lg flex items-center justify-between ${
                    result.success !== false 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileText className={`h-5 w-5 ${
                      result.success !== false ? 'text-green-600' : 'text-red-600'
                    }`} />
                    <div>
                      <p className="font-medium text-gray-900">{result.file}</p>
                      {result.success !== false ? (
                        <p className="text-sm text-green-700">
                          UUID: {result.uuid} | Total: ${result.total}
                        </p>
                      ) : (
                        <p className="text-sm text-red-700">{result.error}</p>
                      )}
                    </div>
                  </div>
                  {result.success !== false ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
