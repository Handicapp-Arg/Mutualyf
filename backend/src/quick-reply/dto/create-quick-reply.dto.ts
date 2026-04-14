import { IsString, IsArray, IsOptional, IsInt, IsBoolean, Min } from 'class-validator';

export class CreateQuickReplyDto {
  @IsArray()
  @IsString({ each: true })
  keywords: string[];

  @IsString()
  response: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
