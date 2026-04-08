import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIP,
  IsISO8601,
  Length,
  Matches,
} from 'class-validator';

export class CreateUserIdentityDto {
  @IsString({ message: 'La dirección IP debe ser una cadena de texto' })
  @IsIP(undefined, { message: 'Formato de dirección IP inválido' })
  @IsNotEmpty({ message: 'La dirección IP es obligatoria' })
  ipAddress: string;

  @IsString({ message: 'El fingerprint debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El fingerprint es obligatorio' })
  @Length(10, 200, {
    message: 'El fingerprint debe tener entre 10 y 200 caracteres',
  })
  fingerprint: string;

  @IsOptional()
  @IsString({ message: 'El nombre de usuario debe ser una cadena de texto' })
  @Length(1, 100, {
    message: 'El nombre de usuario debe tener entre 1 y 100 caracteres',
  })
  @Matches(/^[a-zA-Z0-9\s\-_áéíóúÁÉÍÓÚñÑ]+$/, {
    message:
      'El nombre de usuario solo puede contener letras, números, espacios y guiones',
  })
  userName?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  userAgent?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsString({ message: 'La fecha de primera visita debe ser una cadena de texto' })
  @IsISO8601({}, { message: 'La fecha de primera visita debe estar en formato ISO 8601' })
  firstVisit: string;

  @IsString({ message: 'La fecha de última visita debe ser una cadena de texto' })
  @IsISO8601({}, { message: 'La fecha de última visita debe estar en formato ISO 8601' })
  lastVisit: string;
}

export class UpdateUserNameDto {
  @IsString({ message: 'El fingerprint debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El fingerprint es obligatorio' })
  fingerprint: string;

  @IsString({ message: 'El nombre de usuario debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre de usuario es obligatorio' })
  @Length(1, 100, {
    message: 'El nombre de usuario debe tener entre 1 y 100 caracteres',
  })
  @Matches(/^[a-zA-Z0-9\s\-_áéíóúÁÉÍÓÚñÑ]+$/, {
    message:
      'El nombre de usuario solo puede contener letras, números, espacios y guiones',
  })
  userName: string;
}

export class UserIdentityResponseDto {
  id: number;
  ipAddress: string;
  fingerprint: string;
  userName: string | null;
  userAgent: string | null;
  timezone: string | null;
  language: string | null;
  firstVisit: string;
  lastVisit: string;
  visitCount: number;
}
