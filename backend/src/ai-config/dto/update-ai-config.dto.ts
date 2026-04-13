import { IsOptional, IsString, IsNumber, Min, Max, IsInt } from 'class-validator';

export class UpdateAiConfigDto {
  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(4096)
  maxTokens?: number;
}
