import { ApiProperty } from '@nestjs/swagger';

export class ConversationEntity {
  @ApiProperty()
  id: number;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  startedAt: Date;

  @ApiProperty({ required: false })
  endedAt?: Date;
}
