import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsOptional } from 'class-validator';

export class UpdateConversationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  endedAt?: Date;
}
