import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { OCRService } from './ocr.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { CloudinaryModule } from '../../common/cloudinary.module';

@Module({
  imports: [PrismaModule, CloudinaryModule],
  controllers: [UploadsController],
  providers: [UploadsService, OCRService],
  exports: [UploadsService],
})
export class UploadsModule {}
