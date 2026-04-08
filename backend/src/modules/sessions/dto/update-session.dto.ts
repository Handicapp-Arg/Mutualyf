import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsOptional } from 'class-validator';

export class UpdateSessionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  expiresAt?: Date;
}
