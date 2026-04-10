import { IsString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class UserSessionDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  ip?: string;

  @IsString()
  @IsOptional()
  name?: string;
}

export class CreateFeedbackDto {
  @IsString()
  feedback: string;

  @IsString()
  @IsOptional()
  userMessage?: string;

  @IsString()
  @IsOptional()
  botResponse?: string;

  @ValidateNested()
  @Type(() => UserSessionDto)
  @IsOptional()
  userSession?: UserSessionDto;

  @IsString()
  @IsOptional()
  timestamp?: string;
}
