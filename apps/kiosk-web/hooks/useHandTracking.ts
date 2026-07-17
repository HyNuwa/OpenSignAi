'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { HandLandmarker, FilesetResolver, type NormalizedLandmark } from '@mediapipe/tasks-vision'
import type { PoseFrameDto, HandLandmarksDto } from '@opensign/shared-types'

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task'

interface UseHandTrackingOptions {
  onLandmarks?: (frame: PoseFrameDto) => void
}

interface UseHandTrackingReturn {
  isReady: boolean
  isTracking: boolean
  lastDetection: PoseFrameDto | null
  error: string | null
  start: (video: HTMLVideoElement) => void
  stop: () => void
}

function landmarksToDto(landmarks: NormalizedLandmark[]): HandLandmarksDto['landmarks'] {
  return landmarks.map((lm) => ({
    x: lm.x,
    y: lm.y,
    z: lm.z ?? 0,
  }))
}

const FRAME_SKIP = 3

export function useHandTracking(options: UseHandTrackingOptions = {}): UseHandTrackingReturn {
  const { onLandmarks } = options
  const [isReady, setIsReady] = useState(false)
  const [isTracking, setIsTracking] = useState(false)
  const [lastDetection, setLastDetection] = useState<PoseFrameDto | null>(null)
  const [error, setError] = useState<string | null>(null)

  const landmarkerRef = useRef<HandLandmarker | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const frameIdRef = useRef<number>(0)
  const frameCountRef = useRef<number>(0)
  const onLandmarksRef = useRef(onLandmarks)
  onLandmarksRef.current = onLandmarks

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL)
        if (cancelled) return

        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })
        if (cancelled) return

        landmarkerRef.current = landmarker
        setIsReady(true)
      } catch (err) {
        if (!cancelled) {
          setError(`Error al cargar MediaPipe: ${(err as Error).message}`)
        }
      }
    }

    init()
    return () => {
      cancelled = true
      stopTracking()
    }
  }, [])

  const detectLoop = useCallback(() => {
    const video = videoRef.current
    const landmarker = landmarkerRef.current
    if (!video || !landmarker) return

    if (video.readyState < 2) {
      frameIdRef.current = requestAnimationFrame(detectLoop)
      return
    }

    frameCountRef.current++
    if (frameCountRef.current % FRAME_SKIP !== 0) {
      frameIdRef.current = requestAnimationFrame(detectLoop)
      return
    }

    const now = performance.now()
    const results = landmarker.detectForVideo(video, now)

    const leftHand = results.landmarks[0]
    const rightHand = results.landmarks[1]

    const frame: PoseFrameDto = {
      timestamp: Date.now(),
      leftHand: leftHand
        ? {
            confidence: results.worldLandmarks[0] ? 0.95 : 0.5,
            landmarks: landmarksToDto(leftHand),
          }
        : { confidence: 0, landmarks: [] },
      rightHand: rightHand
        ? {
            confidence: results.worldLandmarks[1] ? 0.95 : 0.5,
            landmarks: landmarksToDto(rightHand),
          }
        : { confidence: 0, landmarks: [] },
    }

    setLastDetection(frame)
    onLandmarksRef.current?.(frame)

    frameIdRef.current = requestAnimationFrame(detectLoop)
  }, [])

  const stopTracking = useCallback(() => {
    if (frameIdRef.current) {
      cancelAnimationFrame(frameIdRef.current)
      frameIdRef.current = 0
    }
    setIsTracking(false)
  }, [])

  const start = useCallback(
    (video: HTMLVideoElement) => {
      videoRef.current = video
      stopTracking()
      setIsTracking(true)
      frameIdRef.current = requestAnimationFrame(detectLoop)
    },
    [detectLoop, stopTracking],
  )

  return { isReady, isTracking, lastDetection, error, start, stop: stopTracking }
}
