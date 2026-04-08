import { ApiProperty } from '@nestjs/swagger';

export class UserEntity {
  @ApiProperty()
  id: number;

  @ApiProperty()
  ipAddress: string;

  @ApiProperty()
  fingerprint: string;

  @ApiProperty({ required: false })
  userName?: string;

  @ApiProperty({ required: false })
  userAgent?: string;

  @ApiProperty({ required: false })
  timezone?: string;

  @ApiProperty({ required: false })
  language?: string;

  @ApiProperty()
  firstVisit: Date;

  @ApiProperty()
  lastVisit: Date;

  @ApiProperty({ required: false })
  visitCount?: number;

  @ApiProperty({ required: false })
  createdAt?: Date;

  @ApiProperty({ required: false })
  updatedAt?: Date;
}
