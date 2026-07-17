import type { HandLandmarksDto } from '@opensign/shared-types'
import { classifyGesture, type SignLabel } from './gesture-classifier'
import type { Handedness } from './gesture-buffer'

export type SignLabelSeq =
  | 'HOLA' | 'GRACIAS' | 'AYUDA' | 'REPETIR' | 'ADIOS' | 'NONE'

export interface SequenceMatch {
  label: SignLabelSeq
  confidence: number
}

const TIP_INDICES = [4, 8, 12, 16, 20]
const MCP_INDICES = [2, 5, 9, 13, 17]
const PIP_INDICES = [3, 6, 10, 14, 18]

function isFingerExtended(landmarks: HandLandmarksDto['landmarks'], tipIdx: number, mcpIdx: number, pipIdx: number): boolean {
  const tip = landmarks[tipIdx]
  const mcp = landmarks[mcpIdx]
  const pip = landmarks[pipIdx]
  if (!tip || !mcp || !pip) return false
  return tip.y < pip.y && pip.y < mcp.y
}

function countExtended(landmarks: HandLandmarksDto['landmarks']): number {
  let n = 0
  for (let i = 0; i < TIP_INDICES.length; i++) {
    if (isFingerExtended(landmarks, TIP_INDICES[i], MCP_INDICES[i], PIP_INDICES[i])) n++
  }
  return n
}

function trajectoryDelta(points: { x: number; y: number }[]): { dx: number; dy: number; total: number } {
  if (points.length < 2) return { dx: 0, dy: 0, total: 0 }
  const a = points[0]
  const b = points[points.length - 1]
  const dx = b.x - a.x
  const dy = b.y - a.y
  const total = points.reduce((acc, p, i) => {
    if (i === 0) return acc
    const prev = points[i - 1]
    return acc + Math.hypot(p.x - prev.x, p.y - prev.y)
  }, 0)
  return { dx, dy, total }
}

function trajectoryCenter(points: { x: number; y: number }[]): { x: number; y: number } | null {
  if (points.length === 0) return null
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
  return { x: sum.x / points.length, y: sum.y / points.length }
}

export function classifySequence(
  handedness: Handedness,
  frames: HandLandmarksDto[],
  trajectory: { x: number; y: number; t: number }[],
): SequenceMatch {
  if (frames.length < 4 || trajectory.length < 4) {
    return { label: 'NONE', confidence: 0 }
  }

  const start = frames[0]
  const end = frames[frames.length - 1]
  const startExtended = countExtended(start.landmarks)
  const endExtended = countExtended(end.landmarks)

  const wristPath = trajectory
  const delta = trajectoryDelta(wristPath)
  const center = trajectoryCenter(wristPath)

  const { label: staticLabel, confidence: staticConf } = classifyGesture(start, end)

  const totalMotion = delta.total
  const timeSpan = wristPath[wristPath.length - 1].t - wristPath[0].t
  const stableMs = timeSpan < 50

  if (staticLabel === 'OPEN_HAND' && startExtended >= 4 && endExtended >= 4 && totalMotion < 0.05 && timeSpan > 300) {
    return { label: 'HOLA', confidence: Math.min(0.9, staticConf) }
  }

  if (
    startExtended <= 1 &&
    endExtended <= 1 &&
    Math.abs(delta.dx) > 0.15 &&
    Math.abs(delta.dx) > Math.abs(delta.dy) * 1.5 &&
    totalMotion > 0.2 &&
    timeSpan > 250
  ) {
    return { label: 'ADIOS', confidence: 0.8 }
  }

  if (
    startExtended >= 2 &&
    endExtended >= 2 &&
    totalMotion > 0.25 &&
    center && center.y < 0.5 &&
    delta.dy < -0.05
  ) {
    return { label: 'GRACIAS', confidence: 0.75 }
  }

  if (
    staticLabel === 'FIST' &&
    endExtended <= 1 &&
    totalMotion > 0.15 &&
    timeSpan > 200
  ) {
    return { label: 'AYUDA', confidence: 0.7 }
  }

  if (
    stableMs &&
    staticLabel !== 'NONE' &&
    staticConf > 0.6 &&
    frames.length > 10
  ) {
    return { label: 'REPETIR', confidence: 0.65 }
  }

  return { label: 'NONE', confidence: 0 }
}

export const SEQUENCE_TO_MEANING: Record<SignLabelSeq, { text: string; gloss: string }> = {
  HOLA: { text: 'Hola', gloss: 'HOLA' },
  GRACIAS: { text: 'Gracias', gloss: 'GRACIAS' },
  AYUDA: { text: 'Necesito ayuda', gloss: 'AYUDA' },
  REPETIR: { text: 'Repetir', gloss: 'REPETIR' },
  ADIOS: { text: 'Chau', gloss: 'ADIOS' },
  NONE: { text: '', gloss: '' },
}

export const SEQUENCE_LABELS: SignLabelSeq[] = ['HOLA', 'GRACIAS', 'AYUDA', 'REPETIR', 'ADIOS']

export const _internal = { countExtended, trajectoryDelta, isFingerExtended }

export type { SignLabel }
