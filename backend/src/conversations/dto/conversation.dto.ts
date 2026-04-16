import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

class MessageDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  role: 'user' | 'assistant';

  @IsString()
  content: string;

  @IsOptional()
  timestamp?: any; // Puede ser Date o string

  @IsOptional()
  attachment?: any; // Metadata de archivo adjunto
}

export class CreateConversationDto {
  @IsString({ message: 'El sessionId debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El sessionId es obligatorio' })
  sessionId: string;

  @IsOptional()
  @IsString()
  userName?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  messages: MessageDto[];

  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  aiModel?: string;

}

export class ConversationResponseDto {
  id: number;
  sessionId: string;
  userMessage: string;
  botResponse: string;
  timestamp: string;
  aiModel: string | null;
}
