import { Injectable } from '@nestjs/common'
import { AiClient } from './ai-client'
import { InterpretationDto, PoseFrameDto } from '@opensign/shared-types'

@Injectable()
export class AiService {
  constructor(private readonly aiClient: AiClient) {}

  async interpret(frame: PoseFrameDto): Promise<InterpretationDto> {
    return this.aiClient.interpret(frame)
  }
}
