'use client'

import React, { useState, useEffect, useRef } from 'react'
// Animation components removed - using CSS transitions

interface LogEntry {
  timestamp: number
  relativeTime: string
  icon: string
  message: string
  status: 'pending' | 'active' | 'completed' | 'error'
}

interface TerminalIgnitionProps {
  onComplete?: () => void
  rfc?: string
}

const IGNITION_STEPS = [
  { icon: '🔐', message: 'Generando llave efímera AES-256-GCM...', duration: 800 },
  { icon: '⚡', message: 'Descifrando FIEL en RAM segura...', duration: 1200 },
  { icon: '🌐', message: 'Estableciendo túnel mTLS con SAT...', duration: 2500 },
  { icon: '📥', message: 'Descargando CFDIs del período...', duration: 3500 },
  { icon: '🗑️', message: 'Destruyendo FIEL de memoria...', duration: 500 },
  { icon: '⚙️', message: 'Escribiendo al Sovereign Ledger...', duration: 1200 },
  { icon: '🧠', message: 'Analizando con Motor NLP fiscal...', duration: 2000 },
]

export function TerminalIgnition({ onComplete, rfc }: TerminalIgnitionProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [leaksFound, setLeaksFound] = useState(3)
  const startTime = useRef(Date.now())
  const logsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (currentStep < IGNITION_STEPS.length) {
      const step = IGNITION_STEPS[currentStep]
      const now = Date.now()
      const relativeTime = ((now - startTime.current) / 1000).toFixed(2)

      // Add new log entry
      setLogs(prev => [...prev, {
        timestamp: now,
        relativeTime: `[${relativeTime.padStart(5, '0')}s]`,
        icon: step.icon,
        message: step.message,
        status: 'active'
      }])

      // Mark previous as completed
      if (currentStep > 0) {
        setLogs(prev => {
          const updated = [...prev]
          if (updated[currentStep - 1]) {
            updated[currentStep - 1].status = 'completed'
          }
          return updated
        })
      }

      // Schedule next step
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1)
      }, step.duration)

      return () => clearTimeout(timer)
    } else {
      // All steps complete
      setLogs(prev => {
        const updated = [...prev]
        if (updated[updated.length - 1]) {
          updated[updated.length - 1].status = 'completed'
        }
        return updated
      })
      
      setTimeout(() => {
        setIsComplete(true)
        onComplete?.()
      }, 500)
    }
  }, [currentStep, onComplete])

  // Auto-scroll to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const getStatusColor = (status: LogEntry['status']) => {
    switch (status) {
      case 'pending': return 'text-gray-500'
      case 'active': return 'text-cyan-400 animate-pulse'
      case 'completed': return 'text-green-400'
      case 'error': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div 
          
          
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-500 font-mono text-sm tracking-wider">IGNITION PROTOCOL v2.0</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            SOVEREIGN TERMINAL
          </h1>
          {rfc && (
            <p className="text-gray-500 font-mono mt-2">RFC: {rfc}</p>
          )}
        </div>

        {/* Terminal Window */}
        <div
          
          
          className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden shadow-2xl"
        >
          {/* Terminal Header */}
          <div className="bg-gray-800 px-4 py-2 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <span className="ml-4 text-gray-400 font-mono text-sm">ignum-cfo — sudo secure-boot — 80x24</span>
          </div>

          {/* Terminal Content */}
          <div className="p-6 font-mono text-sm h-96 overflow-y-auto">
            {/* Boot sequence */}
            <div className="text-gray-500 mb-4">
              <div>Initializing secure enclave...</div>
              <div>Loading HSM module... OK</div>
              <div>Establishing zero-trust connection... OK</div>
              <div className="text-cyan-400 mt-2">{'='.repeat(60)}</div>
            </div>

            {/* Logs */}
            
              {logs.map((log, index) => (
                <div
                  key={index}
                  
                  
                  
                  className={`flex items-start gap-3 mb-2 ${getStatusColor(log.status)}`}
                >
                  <span className="text-gray-600 shrink-0">{log.relativeTime}</span>
                  <span className="shrink-0">{log.icon}</span>
                  <span>{log.message}</span>
                  {log.status === 'active' && (
                    <span className="animate-pulse">▌</span>
                  )}
                  {log.status === 'completed' && (
                    <span className="text-green-500">✓</span>
                  )}
                </div>
              ))}
            

            {/* Completion Message */}
            {isComplete && (
              <div
                
                
                className="mt-6 p-4 border border-yellow-500/50 bg-yellow-500/10 rounded"
              >
                <div className="flex items-center gap-2 text-yellow-400 font-bold text-lg mb-2">
                  <span>⚠️</span>
                  <span>{leaksFound} FUGAS OPERATIVAS DETECTADAS</span>
                </div>
                <div className="text-yellow-200/80 text-sm">
                  Se requiere atención inmediata antes de continuar.
                </div>
                <div className="mt-3 flex gap-2">
                  <button 
                    onClick={() => window.location.href = '/dashboard'}
                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded transition-colors"
                  >
                    VER DASHBOARD →
                  </button>
                </div>
              </div>
            )}

            <div ref={logsEndRef} />
          </div>

          {/* Progress Bar */}
          <div className="h-1 bg-gray-800">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-purple-400"
              
              
              
            />
          </div>
        </div>

        {/* Footer Info */}
        <div
          
          
          
          className="mt-6 flex justify-between items-center text-gray-600 font-mono text-xs"
        >
          <div className="flex gap-4">
            <span>🔒 AES-256-GCM</span>
            <span>🛡️ HSM Protected</span>
            <span>📝 Ledger Anchored</span>
          </div>
          <div>
            v2.0.0-sovereign | TPWR Holdings
          </div>
        </div>
      </div>
    </div>
  )
}
