'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useHandTracking } from '@/hooks/useHandTracking'
import type { PoseFrameDto } from '@opensign/shared-types'

const CANVAS_W = 640
const CANVAS_H = 480

const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
]

function drawHand(
  ctx: CanvasRenderingContext2D,
  landmarks: { x: number; y: number }[],
  w: number,
  h: number,
  color: string,
) {
  if (landmarks.length === 0) return
  ctx.strokeStyle = color
  ctx.lineWidth = 3
  ctx.fillStyle = color

  for (const [i, j] of HAND_CONNECTIONS) {
    const a = landmarks[i]
    const b = landmarks[j]
    if (!a || !b) continue
    ctx.beginPath()
    ctx.moveTo(a.x * w, a.y * h)
    ctx.lineTo(b.x * w, b.y * h)
    ctx.stroke()
  }
  for (const lm of landmarks) {
    ctx.beginPath()
    ctx.arc(lm.x * w, lm.y * h, 5, 0, 2 * Math.PI)
    ctx.fill()
  }
}

interface HandTrackerProps {
  stream: MediaStream
  enabled: boolean
  onLandmarks: (frame: PoseFrameDto) => void
}

export function HandTracker({ stream, enabled, onLandmarks }: HandTrackerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onLandmarksRef = useRef(onLandmarks)
  onLandmarksRef.current = onLandmarks

  const { isReady, isTracking, lastDetection, error, start, stop } = useHandTracking({
    onLandmarks: (frame) => onLandmarksRef.current(frame),
  })

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.srcObject = stream
    video.play().catch(() => {})
  }, [stream])

  useEffect(() => {
    if (!enabled || !isReady) return
    const video = videoRef.current
    if (!video) return

    const onReady = () => {
      if (video.readyState >= 2) {
        start(video)
        video.removeEventListener('loadeddata', onReady)
        video.removeEventListener('canplay', onReady)
      }
    }

    if (video.readyState >= 2) {
      start(video)
    } else {
      video.addEventListener('loadeddata', onReady)
      video.addEventListener('canplay', onReady)
    }

    return () => {
      stop()
      video.removeEventListener('loadeddata', onReady)
      video.removeEventListener('canplay', onReady)
    }
  }, [enabled, isReady, start, stop])

  const drawLandmarks = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = CANVAS_W
    canvas.height = CANVAS_H
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

    if (lastDetection) {
      if (lastDetection.leftHand.landmarks.length > 0) {
        drawHand(ctx, lastDetection.leftHand.landmarks, CANVAS_W, CANVAS_H, '#22c55e')
      }
      if (lastDetection.rightHand.landmarks.length > 0) {
        drawHand(ctx, lastDetection.rightHand.landmarks, CANVAS_W, CANVAS_H, '#3b82f6')
      }
    }
  }, [lastDetection])

  useEffect(() => {
    let raf: number
    function loop() {
      drawLandmarks()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [drawLandmarks])

  return (
    <div className="flex w-full max-w-md flex-col gap-2">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-lg aspect-video">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full object-contain"
        />
      </div>

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
