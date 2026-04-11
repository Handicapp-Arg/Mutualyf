import { IsEmail, IsString, MinLength, IsInt, IsOptional, IsBoolean } from 'class-validator';

export class CreateAdminUserDto {
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  fullName: string;

  @IsInt({ message: 'roleId debe ser un número entero' })
  roleId: number;
}

export class UpdateAdminUserDto {
  @IsOptional()
  @IsEmail({}, { message: 'Email inválido' })
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsInt()
  roleId?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
