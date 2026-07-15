import { Module } from '@nestjs/common'
import { SignModule } from './sign/sign.module'
import { HealthModule } from './health/health.module'

@Module({
  imports: [SignModule, HealthModule],
})
export class AppModule {}
