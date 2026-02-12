import {
  Controller,
  Get,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('uploads')
export class UploadsController {
  private uploads: any[] = [];

  @Get('all')
  async findAll() {
    return this.uploads;
  }

  @Post('medical-order')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/medical-orders',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    })
  )
  async uploadMedicalOrder(@UploadedFile() file: Express.Multer.File, @Body() body: any) {
    const upload = {
      id: `file_${Date.now()}`,
      sessionId: body.sessionId || 'unknown',
      fileName: file.originalname,
      uploadedAt: new Date(),
      path: file.path,
    };

    this.uploads.push(upload);

    return {
      success: true,
      fileId: upload.id,
    };
  }
}
