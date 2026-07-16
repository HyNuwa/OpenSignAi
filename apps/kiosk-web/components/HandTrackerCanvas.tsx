'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { PoseFrameDto } from '@opensign/shared-types'

interface HandTrackerCanvasProps {
  stream: MediaStream
  landmarks: PoseFrameDto | null
}

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
  ctx.lineWidth = 2
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
    ctx.arc(lm.x * w, lm.y * h, 4, 0, 2 * Math.PI)
    ctx.fill()
  }
}

export function HandTrackerCanvas({ stream, landmarks }: HandTrackerCanvasProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (stream) {
      video.srcObject = stream
      video.play().catch(() => {})
    }
  }, [stream])

  const draw = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) return

    const w = video.videoWidth
    const h = video.videoHeight
    canvas.width = w
    canvas.height = h

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, w, h)

    if (landmarks) {
      if (landmarks.leftHand.landmarks.length > 0) {
        drawHand(ctx, landmarks.leftHand.landmarks, w, h, '#22c55e')
      }
      if (landmarks.rightHand.landmarks.length > 0) {
        drawHand(ctx, landmarks.rightHand.landmarks, w, h, '#3b82f6')
      }
    }
  }, [landmarks])

  useEffect(() => {
    let raf: number
    function loop() {
      draw()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [draw])

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-lg">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="hidden"
      />
      <canvas
        ref={canvasRef}
        className="h-auto w-full object-cover"
      />
    </div>
  )
}
