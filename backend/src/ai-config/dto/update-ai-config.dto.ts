import { IsOptional, IsString, IsNumber, Min, Max, IsInt } from 'class-validator';

export class UpdateAiConfigDto {
  @IsOptional()
  @IsString()
  botName?: string;

  @IsOptional()
  @IsString()
  orgName?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  tone?: string;

  @IsOptional()
  @IsString()
  specialtyMapping?: string;

  @IsOptional()
  @IsString()
  customRules?: string;

  @IsOptional()
  @IsString()
  ragGrounding?: string;

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

  @IsOptional()
  @IsString()
  quickButtons?: string;
}
