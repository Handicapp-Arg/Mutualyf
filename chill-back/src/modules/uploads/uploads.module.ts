import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { OCRService } from './ocr.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UploadsController],
  providers: [UploadsService, OCRService],
  exports: [UploadsService],
})
export class UploadsModule {}
