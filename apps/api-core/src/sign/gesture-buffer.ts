import type { PoseFrameDto, HandLandmarksDto } from '@opensign/shared-types'

export type Handedness = 'left' | 'right'

export interface BufferedHand {
  hand: HandLandmarksDto
  handedness: Handedness
  ts: number
}

const BUFFER_WINDOW_MS = 1500
const MAX_BUFFER_SIZE = 60

export class GestureBuffer {
  private frames: { frame: PoseFrameDto; ts: number }[] = []

  push(frame: PoseFrameDto): void {
    const now = frame.timestamp
    this.frames.push({ frame, ts: now })
    this.frames = this.frames.filter((f) => now - f.ts <= BUFFER_WINDOW_MS)
    if (this.frames.length > MAX_BUFFER_SIZE) {
      this.frames.splice(0, this.frames.length - MAX_BUFFER_SIZE)
    }
  }

  pickActiveHand(): BufferedHand | null {
    if (this.frames.length === 0) return null

    let best: BufferedHand | null = null
    for (let i = this.frames.length - 1; i >= 0; i--) {
      const f = this.frames[i]
      if (f.frame.rightHand.landmarks.length >= 21) {
        return { hand: f.frame.rightHand, handedness: 'right', ts: f.ts }
      }
      if (f.frame.leftHand.landmarks.length >= 21) {
        best = { hand: f.frame.leftHand, handedness: 'left', ts: f.ts }
      }
    }
    return best
  }

  trajectoryFor(handedness: Handedness): { x: number; y: number; t: number }[] {
    const out: { x: number; y: number; t: number }[] = []
    for (const { frame, ts } of this.frames) {
      const h =
        handedness === 'right' ? frame.rightHand : frame.leftHand
      if (h.landmarks.length < 21) continue
      const wrist = h.landmarks[0]
      if (!wrist) continue
      out.push({ x: wrist.x, y: wrist.y, t: ts })
    }
    return out
  }

  framesFor(handedness: Handedness): HandLandmarksDto[] {
    const out: HandLandmarksDto[] = []
    for (const { frame } of this.frames) {
      const h =
        handedness === 'right' ? frame.rightHand : frame.leftHand
      if (h.landmarks.length >= 21) out.push(h)
    }
    return out
  }

  clear(): void {
    this.frames = []
  }
}
