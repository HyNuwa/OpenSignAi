import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import type { ServiceError } from '@grpc/grpc-js'
import { InterpretationDto, PoseFrameDto } from '@opensign/shared-types'
import {
  getSignInterpreterClient,
  type ProtoPoseFrame,
  type SignInterpreterClient,
} from './ai-grpc.client'

const DEFAULT_FALLBACK: InterpretationDto = {
  text: 'No se pudo interpretar (fallback)',
  confidence: 0,
  gloss: '',
}

@Injectable()
export class AiClient implements OnModuleInit {
  private readonly logger = new Logger(AiClient.name)
  private client!: SignInterpreterClient
  private healthy = false

  onModuleInit(): void {
    this.client = getSignInterpreterClient()
    this.probe()
  }

  private probe(): void {
    const deadline = new Date(Date.now() + 2000)
    this.client.waitForReady(deadline, (err) => {
      if (err) {
        this.healthy = false
        this.logger.warn(`ai-core gRPC no disponible: ${err.message}. Se reintentará bajo demanda.`)
        setTimeout(() => this.probe(), 5000)
      } else {
        this.healthy = true
        this.logger.log('Conexión gRPC con ai-core establecida')
      }
    })
  }

  async interpret(frame: PoseFrameDto): Promise<InterpretationDto> {
    const request: ProtoPoseFrame = {
      timestamp: frame.timestamp,
      left_hand: {
        confidence: frame.leftHand.confidence,
        landmarks: frame.leftHand.landmarks.map((l) => ({ x: l.x, y: l.y, z: l.z ?? 0 })),
      },
      right_hand: {
        confidence: frame.rightHand.confidence,
        landmarks: frame.rightHand.landmarks.map((l) => ({ x: l.x, y: l.y, z: l.z ?? 0 })),
      },
    }

    return new Promise<InterpretationDto>((resolve) => {
      this.client.Interpret(request, (err: ServiceError | null, response) => {
        if (err) {
          this.healthy = false
          this.logger.warn(`gRPC Interpret falló: ${err.message}. Usando fallback.`)
          this.probe()
          resolve(DEFAULT_FALLBACK)
          return
        }
        this.healthy = true
        resolve({
          text: response.text,
          confidence: response.confidence,
          gloss: response.gloss,
        })
      })
    })
  }

  isHealthy(): boolean {
    return this.healthy
  }
}
