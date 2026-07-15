import { IsEnum, IsObject, IsString, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { SignSocketEvents } from './events.enum'
import { PoseFrameDto } from '../sign/landmark.dto'

export class SocketMessageDto<T = unknown> {
  @IsEnum(SignSocketEvents)
  event!: SignSocketEvents

  @IsString()
  kioskId!: string

  @IsObject()
  payload!: T
}

export class LandmarksMessageDto extends SocketMessageDto {
  @ValidateNested()
  @Type(() => PoseFrameDto)
  payload!: PoseFrameDto
}
