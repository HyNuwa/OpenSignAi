'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { KioskLayout, SignVideoPanel, Button } from '@opensign/ui'
import { useCamera } from '@/hooks/useCamera'
import { getSocketClient } from '@/lib/socket-client'
import { SignSocketEvents } from '@opensign/shared-types'

export function KioskClient() {
  const [status, setStatus] = useState<string>('desconectado')
  const [lastInterpretation, setLastInterpretation] = useState<string>('')
  const { stream, error, isLoading, start, stop } = useCamera()
  const socketRef = useRef<ReturnType<typeof getSocketClient> | null>(null)

  const connectSocket = useCallback(() => {
    const socket = getSocketClient()
    socketRef.current = socket

    socket.on('connect', () => {
      setStatus('conectado')
      socket.emit(SignSocketEvents.JOIN_KIOSK, { kioskId: 'kiosk-001' })
    })

    socket.on('disconnect', () => setStatus('desconectado'))

    socket.on(SignSocketEvents.INTERPRETATION, (data: { text: string }) => {
      setLastInterpretation(data.text)
    })

    socket.on(SignSocketEvents.ERROR, (err: { message: string }) => {
      console.error('Socket error:', err)
      setStatus('error')
    })

    socket.connect()
  }, [])

  useEffect(() => {
    connectSocket()
    return () => {
      socketRef.current?.disconnect()
      stop()
    }
  }, [connectSocket, stop])

  return (
    <KioskLayout title="Bienvenido" status={status}>
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6">
        <h2 className="text-2xl font-semibold text-slate-800">
          Kiosco de atención en Lengua de Señas Argentina
        </h2>
        <p className="text-slate-600">
          Estado del canal: <span className="font-bold capitalize">{status}</span>
        </p>
        <p className="text-center text-sm text-slate-500">
          El procesamiento de visión se realiza en este dispositivo. No se envían videos al servidor.
        </p>

        <SignVideoPanel stream={stream} />

        {error && (
          <div className="w-full rounded-lg bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          {!stream ? (
            <Button onClick={start} disabled={isLoading}>
              {isLoading ? 'Iniciando...' : 'Activar cámara'}
            </Button>
          ) : (
            <Button variant="secondary" onClick={stop}>
              Detener cámara
            </Button>
          )}
        </div>

        {lastInterpretation && (
          <div className="w-full rounded-lg bg-blue-50 p-4 text-blue-900">
            <p className="text-sm font-semibold">Interpretación:</p>
            <p>{lastInterpretation}</p>
          </div>
        )}
      </div>
    </KioskLayout>
  )
}
