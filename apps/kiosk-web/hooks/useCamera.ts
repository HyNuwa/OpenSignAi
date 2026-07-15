'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type CameraError =
  | 'NotAllowedError'
  | 'NotFoundError'
  | 'NotReadableError'
  | 'OverconstrainedError'
  | 'UnknownError'

const errorMessages: Record<CameraError, string> = {
  NotAllowedError: 'No se otorgó permiso para usar la cámara.',
  NotFoundError: 'No se detectó ninguna cámara.',
  NotReadableError: 'La cámara está siendo usada por otra aplicación.',
  OverconstrainedError: 'La cámara no cumple los requisitos solicitados.',
  UnknownError: 'Ocurrió un error inesperado al acceder a la cámara.',
}

interface UseCameraReturn {
  stream: MediaStream | null
  error: string | null
  isLoading: boolean
  start: () => Promise<void>
  stop: () => void
}

const mapError = (err: Error): CameraError => {
  switch (err.name) {
    case 'NotAllowedError':
      return 'NotAllowedError'
    case 'NotFoundError':
      return 'NotFoundError'
    case 'NotReadableError':
      return 'NotReadableError'
    case 'OverconstrainedError':
      return 'OverconstrainedError'
    default:
      return 'UnknownError'
  }
}

export function useCamera(): UseCameraReturn {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const activeStreamRef = useRef<MediaStream | null>(null)

  const stop = useCallback(() => {
    activeStreamRef.current?.getTracks().forEach((track) => track.stop())
    activeStreamRef.current = null
    setStream(null)
  }, [])

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(errorMessages.UnknownError)
      return
    }

    setIsLoading(true)
    setError(null)
    stop()

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1280, height: 720 },
        audio: false,
      })
      activeStreamRef.current = mediaStream
      setStream(mediaStream)
    } catch (err) {
      setError(errorMessages[mapError(err as Error)])
    } finally {
      setIsLoading(false)
    }
  }, [stop])

  useEffect(() => {
    return () => stop()
  }, [stop])

  return { stream, error, isLoading, start, stop }
}
