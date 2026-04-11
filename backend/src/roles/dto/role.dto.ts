import { IsString, MinLength, IsOptional, IsArray, ValidateNested, IsInt, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRoleDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(2)
  displayName: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  displayName?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class PermissionGrantDto {
  @IsInt()
  roleId: number;

  @IsInt()
  permissionId: number;

  @IsBoolean()
  granted: boolean;
}

export class UpdatePermissionMatrixDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionGrantDto)
  grants: PermissionGrantDto[];
}
