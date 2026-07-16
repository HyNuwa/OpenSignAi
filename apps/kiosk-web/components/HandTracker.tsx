'use client'

import { useEffect, useRef } from 'react'
import { useHandTracking } from '@/hooks/useHandTracking'
import { HandTrackerCanvas } from './HandTrackerCanvas'
import type { PoseFrameDto } from '@opensign/shared-types'

interface HandTrackerProps {
  stream: MediaStream
  enabled: boolean
  onLandmarks: (frame: PoseFrameDto) => void
}

export function HandTracker({ stream, enabled, onLandmarks }: HandTrackerProps) {
  const trackingVideoRef = useRef<HTMLVideoElement | null>(null)
  const onLandmarksRef = useRef(onLandmarks)
  onLandmarksRef.current = onLandmarks

  const { isReady, isTracking, lastDetection, error, start, stop } = useHandTracking({
    onLandmarks: (frame) => onLandmarksRef.current(frame),
  })

  useEffect(() => {
    if (!enabled || !stream) return

    const video = document.createElement('video')
    video.setAttribute('playsinline', '')
    video.muted = true
    video.srcObject = stream
    ;(trackingVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = video

    video.play().then(() => {
      video.addEventListener('loadeddata', () => {
        if (isReady) {
          start(video)
        }
      })
    })

    return () => {
      stop()
      video.pause()
      video.srcObject = null
      video.remove()
    }
  }, [enabled, stream, isReady, start, stop])

  return (
    <div className="flex w-full max-w-md flex-col gap-2">
      <HandTrackerCanvas stream={stream} landmarks={lastDetection} />

      {error && (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
          {error}
        </div>
      )}

      {!isReady && enabled && (
        <div className="text-center text-sm text-slate-500">
          Cargando modelo de visión...
        </div>
      )}

      {isReady && isTracking && (
        <div className="flex items-center gap-2 text-xs text-emerald-600">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          Procesando landmarks en el dispositivo
        </div>
      )}
    </div>
  )
}
