import { IsArray, IsNumber, IsOptional, Max, Min, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

export class LandmarkDto {
  @IsNumber()
  x!: number

  @IsNumber()
  y!: number

  @IsNumber()
  @IsOptional()
  z?: number
}

export class HandLandmarksDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence!: number

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LandmarkDto)
  landmarks!: LandmarkDto[]
}

export class PoseFrameDto {
  @IsNumber()
  timestamp!: number

  @ValidateNested()
  @Type(() => HandLandmarksDto)
  leftHand!: HandLandmarksDto

  @ValidateNested()
  @Type(() => HandLandmarksDto)
  rightHand!: HandLandmarksDto
}
