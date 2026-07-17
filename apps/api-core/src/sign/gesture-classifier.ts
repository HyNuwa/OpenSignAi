import type { HandLandmarksDto } from '@opensign/shared-types'

export type SignLabel = 'OPEN_HAND' | 'FIST' | 'POINTING_UP' | 'THUMBS_UP' | 'NONE'

interface ClassifiedHand {
  label: SignLabel
  confidence: number
}

const TIP_INDICES = [4, 8, 12, 16, 20]
const MCP_INDICES = [2, 5, 9, 13, 17]
const PIP_INDICES = [3, 6, 10, 14, 18]
const WRIST = 0
const THUMB_TIP = 4
const THUMB_MCP = 2
const INDEX_TIP = 8
const INDEX_MCP = 5
const INDEX_PIP = 6
const MIDDLE_TIP = 12
const MIDDLE_MCP = 9
const PINKY_TIP = 20
const PINKY_MCP = 17

function isFingerExtended(
  landmarks: HandLandmarksDto['landmarks'],
  tipIdx: number,
  mcpIdx: number,
  pipIdx: number,
): boolean {
  const tip = landmarks[tipIdx]
  const mcp = landmarks[mcpIdx]
  const pip = landmarks[pipIdx]
  if (!tip || !mcp || !pip) return false

  return tip.y < pip.y && pip.y < mcp.y
}

function isFingerCurled(
  landmarks: HandLandmarksDto['landmarks'],
  tipIdx: number,
  mcpIdx: number,
): boolean {
  const tip = landmarks[tipIdx]
  const mcp = landmarks[mcpIdx]
  if (!tip || !mcp) return false

  return tip.y > mcp.y
}

function classifySingleHand(hand: HandLandmarksDto): ClassifiedHand {
  const { landmarks } = hand
  if (landmarks.length < 21) return { label: 'NONE', confidence: 0 }

  let extendedCount = 0
  const extended: boolean[] = []

  for (let i = 0; i < TIP_INDICES.length; i++) {
    const ext = isFingerExtended(landmarks, TIP_INDICES[i], MCP_INDICES[i], PIP_INDICES[i])
    extended.push(ext)
    if (ext) extendedCount++
  }

  const thumbUp = landmarks[THUMB_TIP] && landmarks[WRIST] && landmarks[THUMB_TIP].y < landmarks[WRIST].y - 0.1

  const otherCurled = isFingerCurled(landmarks, INDEX_TIP, INDEX_MCP) &&
    isFingerCurled(landmarks, MIDDLE_TIP, MIDDLE_MCP)

  if (thumbUp && otherCurled && extendedCount <= 1) {
    return { label: 'THUMBS_UP', confidence: hand.confidence * 0.8 }
  }

  if (extendedCount >= 4) {
    return { label: 'OPEN_HAND', confidence: hand.confidence * 0.9 }
  }

  if (extendedCount === 0) {
    return { label: 'FIST', confidence: hand.confidence * 0.8 }
  }

  const indexUp = extended[1]
  const othersDown = !extended[0] && !extended[2] && !extended[3] && !extended[4]
  if (indexUp && othersDown) {
    return { label: 'POINTING_UP', confidence: hand.confidence * 0.7 }
  }

  return { label: 'NONE', confidence: 0 }
}

export function classifyGesture(leftHand: HandLandmarksDto, rightHand: HandLandmarksDto): {
  label: SignLabel
  confidence: number
} {
  const left = classifySingleHand(leftHand)
  const right = classifySingleHand(rightHand)

  const best = left.confidence >= right.confidence ? left : right

  if (best.confidence < 0.3) {
    return { label: 'NONE', confidence: 0 }
  }

  return { label: best.label, confidence: best.confidence }
}

export const SIGN_TO_MEANING: Record<SignLabel, { text: string; gloss: string }> = {
  OPEN_HAND: { text: 'Hola', gloss: 'HOLA' },
  FIST: { text: 'Sí', gloss: 'SI' },
  POINTING_UP: { text: 'No', gloss: 'NO' },
  THUMBS_UP: { text: 'Bien', gloss: 'BIEN' },
  NONE: { text: 'Procesando...', gloss: '' },
}
