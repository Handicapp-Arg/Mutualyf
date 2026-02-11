import { IsString, IsNotEmpty, IsISO8601, IsOptional } from 'class-validator';

export class CreateSessionDto {
  @IsString({ message: 'El sessionId debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El sessionId es obligatorio' })
  sessionId: string;

  @IsOptional()
  @IsString({ message: 'El nombre de usuario debe ser una cadena de texto' })
  userName?: string;

  @IsString({ message: 'El lastSeen debe ser una cadena de texto' })
  @IsISO8601({}, { message: 'El lastSeen debe estar en formato ISO 8601' })
  lastSeen: string;

  @IsOptional()
  @IsString({ message: 'El fingerprint debe ser una cadena de texto' })
  fingerprint?: string;

  @IsOptional()
  @IsString({ message: 'La IP debe ser una cadena de texto' })
  ipAddress?: string;
}

export class SessionResponseDto {
  id: number;
  sessionId: string;
  userName: string;
  lastSeen: string;
  userIdentityId?: number;
}
