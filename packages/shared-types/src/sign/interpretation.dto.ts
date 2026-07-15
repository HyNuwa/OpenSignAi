import { IsNumber, IsString, IsOptional, Min, Max } from 'class-validator'

export class InterpretationDto {
  @IsString()
  text!: string

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence!: number

  @IsString()
  @IsOptional()
  gloss?: string
}
