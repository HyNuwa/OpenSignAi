import { Injectable } from '@nestjs/common'
import { AiService } from '../ai/ai.service'
import { InterpretationDto, PoseFrameDto } from '@opensign/shared-types'

@Injectable()
export class SignService {
  constructor(private readonly aiService: AiService) {}

  async interpret(frame: PoseFrameDto): Promise<InterpretationDto> {
    const localConfidence = frame.leftHand.confidence + frame.rightHand.confidence

    if (localConfidence > 1.6) {
      return {
        text: 'Seña reconocida localmente',
        confidence: localConfidence / 2,
      }
    }

    return this.aiService.interpret(frame)
  }
}
