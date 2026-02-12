import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsISO8601,
  Length,
} from 'class-validator';

export class CreateConversationDto {
  @IsString({ message: 'El sessionId debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El sessionId es obligatorio' })
  sessionId: string;

  @IsString({ message: 'El mensaje del usuario debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El mensaje del usuario es obligatorio' })
  @Length(1, 5000, {
    message: 'El mensaje debe tener entre 1 y 5000 caracteres',
  })
  userMessage: string;

  @IsString({ message: 'La respuesta del bot debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La respuesta del bot es obligatoria' })
  @Length(1, 10000, {
    message: 'La respuesta debe tener entre 1 y 10000 caracteres',
  })
  botResponse: string;

  @IsString({ message: 'El timestamp debe ser una cadena de texto' })
  @IsISO8601({}, { message: 'El timestamp debe estar en formato ISO 8601' })
  timestamp: string;

  @IsOptional()
  @IsString()
  aiModel?: string;

  @IsOptional()
  @IsBoolean()
  userFeedback?: boolean;
}

export class UpdateConversationFeedbackDto {
  @IsNotEmpty({ message: 'El ID de la conversación es obligatorio' })
  id: number;

  @IsBoolean({ message: 'El feedback debe ser un valor booleano' })
  userFeedback: boolean;
}

export class ConversationResponseDto {
  id: number;
  sessionId: string;
  userMessage: string;
  botResponse: string;
  timestamp: string;
  aiModel: string | null;
  userFeedback: boolean | null;
}
