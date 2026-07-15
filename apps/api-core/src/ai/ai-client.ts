import { Injectable, Logger } from '@nestjs/common'
import { InterpretationDto, PoseFrameDto } from '@opensign/shared-types'

@Injectable()
export class AiClient {
  private readonly logger = new Logger(AiClient.name)

  async interpret(_frame: PoseFrameDto): Promise<InterpretationDto> {
    this.logger.log('Stub: gRPC call to ai-core would happen here')

    return {
      text: 'Interpretación remota (stub)',
      confidence: 0.75,
      gloss: 'STUB-INTERPRETACION',
    }
  }
}
