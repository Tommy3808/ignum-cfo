'use client'

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
// Animation components removed - using CSS transitions
import { Shield, Upload, Lock, FileCheck, AlertTriangle, Key } from 'lucide-react'

// WebCrypto API for client-side encryption
async function generateEncryptionKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

async function encryptFile(file: ArrayBuffer, key: CryptoKey): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    file
  )
  return { encrypted, iv }
}

async function exportKey(key: CryptoKey): Promise<ArrayBuffer> {
  return await window.crypto.subtle.exportKey('raw', key)
}

interface FIELUploadProps {
  tenantId: string
  onComplete?: () => void
}

function FIELUpload({ tenantId, onComplete }: FIELUploadProps) {
  const [step, setStep] = useState<'upload' | 'password' | 'encrypting' | 'complete'>('upload')
  const [files, setFiles] = useState<{ cer?: File; key?: File }>({})
  const [password, setPassword] = useState('')
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')

  const onDropCer = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFiles(prev => ({ ...prev, cer: acceptedFiles[0] }))
    }
  }, [])

  const onDropKey = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFiles(prev => ({ ...prev, key: acceptedFiles[0] }))
    }
  }, [])

  const { getRootProps: getCerProps, getInputProps: getCerInput } = useDropzone({
    onDrop: onDropCer,
    accept: { 'application/x-x509-ca-cert': ['.cer', '.CER'] },
    multiple: false
  })

  const { getRootProps: getKeyProps, getInputProps: getKeyInput } = useDropzone({
    onDrop: onDropKey,
    accept: { 'application/pkcs8': ['.key', '.KEY'] },
    multiple: false
  })

  const handleUpload = async () => {
    if (!files.cer || !files.key || !password) return

    setStep('encrypting')
    setStatus('Generando clave de encriptación efímera...')
    setProgress(10)

    try {
      // Generar clave AES-256-GCM
      const encryptionKey = await generateEncryptionKey()
      const rawKey = await exportKey(encryptionKey)

      setStatus('Leyendo certificado...')
      setProgress(25)

      // Leer archivos
      const cerBuffer = await files.cer.arrayBuffer()
      const keyBuffer = await files.key.arrayBuffer()

      setStatus('Encriptando certificado (client-side)...')
      setProgress(40)

      // Encriptar certificado
      const cerEncrypted = await encryptFile(cerBuffer, encryptionKey)

      setStatus('Encriptando llave privada (client-side)...')
      setProgress(60)

      // Encriptar llave
      const keyEncrypted = await encryptFile(keyBuffer, encryptionKey)

      setStatus('Encriptando contraseña...')
      setProgress(75)

      // Encriptar password
      const passwordEncoder = new TextEncoder()
      const passwordBuffer = passwordEncoder.encode(password).buffer
      const passwordEncrypted = await encryptFile(passwordBuffer, encryptionKey)

      setStatus('Enviando a Bóveda Segura...')
      setProgress(90)

      // Enviar al backend
      const formData = new FormData()
      formData.append('tenant_id', tenantId)
      formData.append('rfc', 'ABC010101ABC') // Extraer del certificado en producción
      formData.append('razon_social', 'Empresa Demo SA de CV')
      
      // Convertir a base64 para envío
      formData.append('certificado_encrypted', btoa(String.fromCharCode(...Array.from(new Uint8Array(cerEncrypted.encrypted)))));
      formData.append('llave_encrypted', btoa(String.fromCharCode(...Array.from(new Uint8Array(keyEncrypted.encrypted)))));
      formData.append('password_encrypted', btoa(String.fromCharCode(...Array.from(new Uint8Array(passwordEncrypted.encrypted)))));
      
      formData.append('iv_cert', btoa(String.fromCharCode(...Array.from(cerEncrypted.iv))));
      formData.append('iv_key', btoa(String.fromCharCode(...Array.from(keyEncrypted.iv))));
      formData.append('iv_password', btoa(String.fromCharCode(...Array.from(passwordEncrypted.iv))));

      const response = await fetch('/api/v2/fiel/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        setProgress(100)
        setStatus('¡FIEL almacenada de forma segura!')
        setStep('complete')
        
        // Limpiar memoria
        setPassword('')
        setFiles({})
        
        setTimeout(() => {
          onComplete?.()
        }, 2000)
      } else {
        throw new Error('Error al enviar al servidor')
      }

    } catch (error) {
      setStatus('Error: ' + (error as Error).message)
      setStep('upload')
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div
          
          
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-zinc-800 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#D4A574] to-[#E8C9A0] bg-clip-text text-transparent">
            Bóveda FIEL
          </h1>
          <p className="text-gray-400 mt-2">
            Encriptación client-side AES-256-GCM antes de enviar al servidor
          </p>
        </div>

        
          {step === 'upload' && (
            <div
              key="upload"
              
              
              
              className="space-y-4"
            >
              {/* Upload CER */}
              <div
                {...getCerProps()}
                className={`border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${
                  files.cer ? 'border-green-500 bg-green-500/10' : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <input {...getCerInput()} />
                <div className="flex items-center justify-center gap-3">
                  {files.cer ? (
                    <>
                      <FileCheck className="w-6 h-6 text-green-400" />
                      <span className="text-green-400">{files.cer.name}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-gray-400" />
                      <span className="text-gray-400">Arrastra tu archivo .cer o haz clic</span>
                    </>
                  )}
                </div>
              </div>

              {/* Upload KEY */}
              <div
                {...getKeyProps()}
                className={`border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${
                  files.key ? 'border-green-500 bg-green-500/10' : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <input {...getKeyInput()} />
                <div className="flex items-center justify-center gap-3">
                  {files.key ? (
                    <>
                      <FileCheck className="w-6 h-6 text-green-400" />
                      <span className="text-green-400">{files.key.name}</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-6 h-6 text-gray-400" />
                      <span className="text-gray-400">Arrastra tu archivo .key o haz clic</span>
                    </>
                  )}
                </div>
              </div>

              {/* Password */}
              {files.cer && files.key && (
                <div
                  
                  
                  className="space-y-4"
                >
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Contraseña de la FIEL"
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>

                  <button
                    onClick={() => setStep('password')}
                    disabled={!password}
                    className="w-full py-4 bg-white hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-900 font-bold rounded-xl transition-all"
                  >
                    Continuar
                  </button>
                </div>
              )}

              {/* Security Notice */}
              <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-200">
                  <strong>Seguridad:</strong> Tus archivos se encriptan en tu navegador antes de enviarse. 
                  El servidor nunca recibe la FIEL en texto plano. Usamos AES-256-GCM con claves efímeras.
                </p>
              </div>
            </div>
          )}

          {step === 'password' && (
            <div
              key="password"
              
              
              
              className="bg-gray-900 border border-gray-800 rounded-xl p-6"
            >
              <h3 className="text-xl font-bold mb-4">Confirmar subida</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-400">Certificado</span>
                  <span className="text-green-400">{files.cer?.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-400">Llave privada</span>
                  <span className="text-green-400">{files.key?.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-400">Contraseña</span>
                  <span className="text-cyan-400">{'•'.repeat(password.length)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('upload')}
                  className="flex-1 py-3 border border-gray-700 hover:bg-gray-800 rounded-xl transition-colors"
                >
                  Regresar
                </button>
                <button
                  onClick={handleUpload}
                  className="flex-1 py-3 bg-white hover:bg-zinc-100 text-zinc-900 font-bold rounded-xl transition-all"
                >
                  Encriptar y Subir
                </button>
              </div>
            </div>
          )}

          {step === 'encrypting' && (
            <div
              key="encrypting"
              
              
              
              className="text-center py-12"
            >
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div
                  className="absolute inset-0 border-4 border-cyan-500/30 rounded-full"
                  
                  
                />
                <div
                  className="absolute inset-2 border-4 border-zinc-600/30 rounded-full border-t-zinc-400"
                  
                  
                />
                <Lock className="absolute inset-0 m-auto w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-xl font-bold mb-2">Encriptando FIEL...</h3>
              <p className="text-gray-400 mb-6">{status}</p>
              
              <div className="w-full max-w-xs mx-auto bg-gray-800 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-white"
                  
                  
                  
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">{progress}%</p>
            </div>
          )}

          {step === 'complete' && (
            <div
              key="complete"
              
              
              className="text-center py-12"
            >
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileCheck className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-2">¡FIEL Guardada!</h3>
              <p className="text-gray-400">
                Tu FIEL está ahora en la Bóveda Segura encriptada.
              </p>
            </div>
          )}
        
      </div>
    </div>
  )
}


// Default export for Next.js page
export default function FIELUploadPage() {
  return <FIELUpload tenantId="default" />
}
