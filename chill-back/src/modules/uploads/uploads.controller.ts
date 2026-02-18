import {
  Controller,
  Get,
  Post,
  Put,
  UseInterceptors,
  UploadedFile,
  Body,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UploadsService } from './uploads.service';
import { CreateMedicalOrderDto, ValidateMedicalOrderDto } from './dto/medical-order.dto';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  /**
   * Procesar archivo con OCR y extraer datos
   * Este endpoint se llama PRIMERO para analizar el archivo
   */
  @Post('medical-order/analyze')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/temp',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `temp_${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    })
  )
  async analyzeMedicalOrder(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any
  ) {
    return this.uploadsService.analyzeFile(file, body.sessionId);
  }

  /**
   * Subir orden médica con validación completa
   * Este endpoint se llama DESPUÉS de que el usuario confirme los datos
   */
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
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    })
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

  /**
   * Obtener todas las órdenes médicas
   */
  @Get('medical-orders')
  async getAllOrders() {
    return this.uploadsService.getAllOrders();
  }

  /**
   * Obtener órdenes por DNI
   */
  @Get('medical-orders/dni/:dni')
  async getOrdersByDNI(@Param('dni') dni: string) {
    return this.uploadsService.getOrdersByDNI(dni);
  }

  /**
   * Validar o rechazar orden médica
   */
  @Put('medical-orders/validate')
  async validateOrder(@Body() dto: ValidateMedicalOrderDto) {
    return this.uploadsService.validateOrder(dto);
  }

  // Mantener endpoint legacy para compatibilidad
  @Get('all')
  async findAll() {
    return this.uploadsService.getAllOrders();
  }
}
