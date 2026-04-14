import { IsString, IsNotEmpty, IsDate, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSessionDto {
  @IsString({ message: 'El sessionId debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El sessionId es obligatorio' })
  sessionId: string;

  @IsOptional()
  @IsString({ message: 'El nombre de usuario debe ser una cadena de texto' })
  userName?: string;

  @Type(() => Date)
  @IsDate({ message: 'El lastSeen debe ser una fecha válida' })
  lastSeen: Date;

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
  lastSeen: Date;
  userIdentityId?: number;
}
