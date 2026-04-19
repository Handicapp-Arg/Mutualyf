import {
  Controller,
  Get,
  Post,
  Put,
  UseInterceptors,
  UseGuards,
  UploadedFile,
  Body,
  Param,
  Res,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage, memoryStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync } from 'fs';
import { UploadsService } from './uploads.service';
import { CreateMedicalOrderDto, ValidateMedicalOrderDto } from './dto/medical-order.dto';
import { Public } from '../../auth/decorators/public.decorator';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { PermissionCode } from '../../auth/constants/permissions.enum';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  // Analyze usa diskStorage porque el OCR lee desde path en disco
  @Public()
  @Post('medical-order/analyze')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/temp',
        filename: (_req, file, cb) => {
          const randomName = Array(32).fill(null).map(() => Math.round(Math.random() * 16).toString(16)).join('');
          cb(null, `temp_${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async analyzeMedicalOrder(@UploadedFile() file: Express.Multer.File, @Body() body: any) {
    return this.uploadsService.analyzeFile(file, body.sessionId);
  }

  // Upload confirmado → va a Cloudinary (memoryStorage)
  @Public()
  @Post('medical-order')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadMedicalOrder(@UploadedFile() file: Express.Multer.File, @Body() body: any) {
    const dto: CreateMedicalOrderDto = {
      sessionId: body.sessionId,
      patientDNI: body.patientDNI,
      patientName: body.patientName,
      patientPhone: body.patientPhone,
      orderDate: body.orderDate,
      doctorName: body.doctorName,
      doctorLicense: body.doctorLicense,
      healthInsurance: body.healthInsurance,
      requestedStudies: JSON.parse(body.requestedStudies || '[]'),
    };
    return this.uploadsService.createMedicalOrder(dto, file);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionCode.UPLOADS_READ)
  @Get('medical-orders/file/:id')
  async downloadOrderFile(@Param('id') id: string, @Res() res: Response) {
    const order = await this.uploadsService.getOrderById(parseInt(id));

    if (!order || !order.filePath) {
      throw new NotFoundException('Archivo no encontrado');
    }

    // Cloudinary URL → redirect
    if (order.filePath.startsWith('http')) {
      return res.redirect(order.filePath);
    }

    // Compatibilidad con archivos locales viejos
    const absolutePath = join(process.cwd(), order.filePath);
    if (!existsSync(absolutePath)) {
      throw new NotFoundException('Archivo no encontrado en el sistema');
    }
    res.setHeader('Content-Type', order.fileType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${order.fileName}"`);
    return res.sendFile(absolutePath);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionCode.UPLOADS_READ)
  @Get('medical-orders')
  async getAllOrders() {
    return this.uploadsService.getAllOrders();
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionCode.UPLOADS_READ)
  @Get('medical-orders/dni/:dni')
  async getOrdersByDNI(@Param('dni') dni: string) {
    return this.uploadsService.getOrdersByDNI(dni);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionCode.UPLOADS_VALIDATE)
  @Put('medical-orders/validate')
  async validateOrder(@Body() dto: ValidateMedicalOrderDto) {
    return this.uploadsService.validateOrder(dto);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionCode.UPLOADS_READ)
  @Get('all')
  async findAll() {
    return this.uploadsService.getAllOrders();
  }
}
