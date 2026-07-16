'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { KioskLayout, Button } from '@opensign/ui'
import { useCamera } from '@/hooks/useCamera'
import { HandTracker } from './HandTracker'
import { getSocketClient } from '@/lib/socket-client'
import { SignSocketEvents } from '@opensign/shared-types'
import type { PoseFrameDto } from '@opensign/shared-types'

export function KioskClient() {
  const [status, setStatus] = useState<string>('desconectado')
  const [lastInterpretation, setLastInterpretation] = useState<string>('')
  const { stream, error, isLoading, start, stop } = useCamera()
  const [trackingEnabled, setTrackingEnabled] = useState(false)
  const socketRef = useRef<ReturnType<typeof getSocketClient> | null>(null)
  const lastSendRef = useRef<number>(0)

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

  const handleLandmarks = useCallback(
    (frame: PoseFrameDto) => {
      const now = Date.now()
      if (now - lastSendRef.current < 100) return
      lastSendRef.current = now

      socketRef.current?.emit(SignSocketEvents.LANDMARKS, {
        event: SignSocketEvents.LANDMARKS,
        kioskId: 'kiosk-001',
        payload: frame,
      })
    },
    [],
  )

  const handleStartCamera = useCallback(async () => {
    await start()
    setTrackingEnabled(true)
  }, [start])

  const handleStopCamera = useCallback(() => {
    setTrackingEnabled(false)
    stop()
  }, [stop])

  useEffect(() => {
    connectSocket()
    return () => {
      socketRef.current?.disconnect()
      handleStopCamera()
    }
  }, [connectSocket, handleStopCamera])

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

        {stream && trackingEnabled ? (
          <HandTracker
            stream={stream}
            enabled={trackingEnabled}
            onLandmarks={handleLandmarks}
          />
        ) : (
          <div className="flex w-full max-w-md items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 aspect-video">
            <p className="text-slate-400">Cámara inactiva</p>
          </div>
        )}

        {error && (
          <div className="w-full rounded-lg bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          {!stream ? (
            <Button onClick={handleStartCamera} disabled={isLoading}>
              {isLoading ? 'Iniciando...' : 'Activar cámara'}
            </Button>
          ) : (
            <Button variant="secondary" onClick={handleStopCamera}>
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
