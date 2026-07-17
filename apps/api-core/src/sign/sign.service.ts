import { Injectable, Logger } from '@nestjs/common'
import { AiService } from '../ai/ai.service'
import { InterpretationDto, PoseFrameDto } from '@opensign/shared-types'
import { classifyGesture, SIGN_TO_MEANING } from './gesture-classifier'
import { GestureBuffer } from './gesture-buffer'
import { classifySequence, SEQUENCE_TO_MEANING, SEQUENCE_LABELS } from './sequence-classifier'

const COOLDOWN_MS = 1500
const STABILITY_MS = 350

interface KioskState {
  buffer: GestureBuffer
  lastEmit: number
  lastEmittedText: string
  stableSince: number
  pendingLabel: string
}

@Injectable()
export class SignService {
  private readonly logger = new Logger(SignService.name)
  private readonly states = new Map<string, KioskState>()

  constructor(private readonly aiService: AiService) {}

  async interpret(kioskId: string, frame: PoseFrameDto): Promise<InterpretationDto> {
    const state = this.getState(kioskId)
    state.buffer.push(frame)
    const now = frame.timestamp

    const idle = this.isIdle(frame)
    if (idle) {
      state.stableSince = 0
      state.pendingLabel = ''
      if (now - state.lastEmit > COOLDOWN_MS) {
        state.lastEmittedText = ''
      }
      return { text: state.lastEmittedText, confidence: 0, gloss: '' }
    }

    const sequence = this.trySequence(state, now)
    if (sequence) {
      state.lastEmit = now
      state.lastEmittedText = sequence.text
      state.stableSince = 0
      state.pendingLabel = ''
      return sequence
    }

    const { label, confidence } = classifyGesture(frame.leftHand, frame.rightHand)

    if (label !== 'NONE' && confidence > 0.55) {
      if (state.pendingLabel === label) {
        const held = now - state.stableSince
        if (
          held >= STABILITY_MS &&
          now - state.lastEmit > COOLDOWN_MS &&
          state.lastEmittedText !== SIGN_TO_MEANING[label].text
        ) {
          const meaning = SIGN_TO_MEANING[label]
          this.logger.log(`[${kioskId}] Estático: ${label} → "${meaning.text}" (${(confidence * 100).toFixed(0)}%)`)
          state.lastEmit = now
          state.lastEmittedText = meaning.text
          state.stableSince = 0
          state.pendingLabel = ''
          return { text: meaning.text, confidence, gloss: meaning.gloss }
        }
      } else {
        state.pendingLabel = label
        state.stableSince = now
      }
    } else {
      state.pendingLabel = ''
      state.stableSince = 0
    }

    return { text: state.lastEmittedText, confidence: 0, gloss: '' }
  }

  private isIdle(frame: PoseFrameDto): boolean {
    return frame.leftHand.landmarks.length < 21 && frame.rightHand.landmarks.length < 21
  }

  private trySequence(state: KioskState, now: number): InterpretationDto | null {
    const active = state.buffer.pickActiveHand()
    if (!active) return null

    const frames = state.buffer.framesFor(active.handedness)
    const trajectory = state.buffer.trajectoryFor(active.handedness)
    if (frames.length < 6) return null

    const { label, confidence } = classifySequence(active.handedness, frames, trajectory)
    if (label === 'NONE' || confidence < 0.6) return null

    const meaning = SEQUENCE_TO_MEANING[label]
    if (now - state.lastEmit < COOLDOWN_MS) return null
    if (state.lastEmittedText === meaning.text) return null

    this.logger.log(`[state] Secuencia: ${label} → "${meaning.text}" (${(confidence * 100).toFixed(0)}%)`)
    return { text: meaning.text, confidence, gloss: meaning.gloss }
  }

  private getState(kioskId: string): KioskState {
    let s = this.states.get(kioskId)
    if (!s) {
      s = {
        buffer: new GestureBuffer(),
        lastEmit: 0,
        lastEmittedText: '',
        stableSince: 0,
        pendingLabel: '',
      }
      this.states.set(kioskId, s)
    }
    return s
  }

  resetKiosk(kioskId: string): void {
    const s = this.states.get(kioskId)
    if (!s) return
    s.buffer.clear()
    s.lastEmit = 0
    s.lastEmittedText = ''
    s.stableSince = 0
    s.pendingLabel = ''
  }
}

export const _types = { SEQUENCE_LABELS }
