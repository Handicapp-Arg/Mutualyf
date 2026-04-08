import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  ipAddress: string;

  @ApiProperty()
  @IsString()
  fingerprint: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  userName?: string;
}
