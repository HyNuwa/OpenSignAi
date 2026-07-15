import { Module } from '@nestjs/common'
import { SignGateway } from './sign.gateway'
import { SignService } from './sign.service'
import { AiModule } from '../ai/ai.module'

@Module({
  imports: [AiModule],
  providers: [SignGateway, SignService],
})
export class SignModule {}
