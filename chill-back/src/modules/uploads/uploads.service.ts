import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMedicalOrderDto, ValidateMedicalOrderDto } from './dto/medical-order.dto';
import { OCRService } from './ocr.service';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(
    private prisma: PrismaService,
    private ocrService: OCRService
  ) {}

  /**
   * Validar archivo subido
   */
  validateFile(file: Express.Multer.File) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Formato de archivo no válido. Solo se permiten PDF, JPG y PNG'
      );
    }

    if (file.size > maxSize) {
      throw new BadRequestException('El archivo es demasiado grande. Máximo 5MB');
    }

    return true;
  }

  /**
   * Analizar archivo con OCR y extraer datos
   */
  async analyzeFile(file: Express.Multer.File, sessionId: string) {
    try {
      this.logger.log(`Analizando archivo con OCR: ${file.originalname}`);

      // Validar archivo
      this.validateFile(file);

      // Procesar con OCR
      const extractedData = await this.ocrService.processFile(file.path, file.mimetype);

      // Mapear confianza a validación
      const validation = {
        patientDNI: {
          value: extractedData.patientDNI.value,
          confidence: extractedData.patientDNI.confidence,
          isValid:
            extractedData.patientDNI.confidence >= 0.7 &&
            /^\d{7,8}$/.test(extractedData.patientDNI.value),
          error:
            extractedData.patientDNI.confidence < 0.7
              ? 'No se pudo detectar con confianza'
              : null,
        },
        patientName: {
          value: extractedData.patientName.value,
          confidence: extractedData.patientName.confidence,
          isValid:
            extractedData.patientName.confidence >= 0.6 &&
            extractedData.patientName.value.length > 0,
          error:
            extractedData.patientName.confidence < 0.6 ? 'No se pudo detectar' : null,
        },
        orderDate: {
          value: extractedData.orderDate.value,
          confidence: extractedData.orderDate.confidence,
          isValid:
            extractedData.orderDate.confidence >= 0.7 &&
            extractedData.orderDate.value.length > 0,
          error: extractedData.orderDate.confidence < 0.7 ? 'No se pudo detectar' : null,
        },
        doctorName: {
          value: extractedData.doctorName.value,
          confidence: extractedData.doctorName.confidence,
          isValid:
            extractedData.doctorName.confidence >= 0.6 &&
            extractedData.doctorName.value.length > 0,
          error: extractedData.doctorName.confidence < 0.6 ? 'No se pudo detectar' : null,
        },
        doctorLicense: {
          value: extractedData.doctorLicense.value,
          confidence: extractedData.doctorLicense.confidence,
          isValid: true, // Opcional
          error: null,
        },
        healthInsurance: {
          value: extractedData.healthInsurance.value,
          confidence: extractedData.healthInsurance.confidence,
          isValid: true, // Opcional
          error: null,
        },
        requestedStudies: {
          value: extractedData.requestedStudies.value,
          confidence: extractedData.requestedStudies.confidence,
          isValid: extractedData.requestedStudies.value.length > 0,
          error:
            extractedData.requestedStudies.value.length === 0
              ? 'No se detectaron estudios'
              : null,
        },
      };

      // Contar campos detectados
      const totalFields = 7;
      const detectedFields = Object.values(validation).filter(
        (field: any) => field.confidence > 0.5
      ).length;
      const detectionRate = (detectedFields / totalFields) * 100;

      return {
        success: true,
        message: `Análisis completado. ${detectedFields}/${totalFields} campos detectados`,
        data: {
          sessionId,
          fileName: file.originalname,
          detectionRate: Math.round(detectionRate),
          fields: validation,
          tempFilePath: file.path,
        },
      };
    } catch (error) {
      this.logger.error(`Error analizando archivo: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validar datos de la orden médica
   */
  validateOrderData(dto: CreateMedicalOrderDto) {
    // Validar DNI (7-8 dígitos)
    const dniRegex = /^\d{7,8}$/;
    if (!dniRegex.test(dto.patientDNI)) {
      throw new BadRequestException('DNI inválido. Debe tener 7 u 8 dígitos');
    }

    // Validar fecha de la orden (no más de 6 meses de antigüedad)
    const orderDate = new Date(dto.orderDate);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    if (orderDate < sixMonthsAgo) {
      throw new BadRequestException(
        'La orden médica es muy antigua. Debe tener menos de 6 meses'
      );
    }

    if (orderDate > new Date()) {
      throw new BadRequestException('La fecha de la orden no puede ser futura');
    }

    // Validar que tenga al menos un estudio solicitado
    if (!dto.requestedStudies || dto.requestedStudies.length === 0) {
      throw new BadRequestException('Debe especificar al menos un estudio solicitado');
    }

    return true;
  }

  /**
   * Crear orden médica
   */
  async createMedicalOrder(dto: CreateMedicalOrderDto, file: Express.Multer.File) {
    try {
      this.logger.debug(`Creando orden médica para DNI: ${dto.patientDNI}`);

      // Validar archivo
      this.validateFile(file);

      // Validar datos
      this.validateOrderData(dto);

      // Crear en base de datos
      const order = await this.prisma.medicalOrder.create({
        data: {
          sessionId: dto.sessionId,
          patientDNI: dto.patientDNI,
          patientName: dto.patientName,
          patientPhone: dto.patientPhone || null,
          orderDate: dto.orderDate,
          doctorName: dto.doctorName || null,
          doctorLicense: dto.doctorLicense || null,
          healthInsurance: dto.healthInsurance || null,
          requestedStudies: JSON.stringify(dto.requestedStudies),
          fileName: file.originalname,
          filePath: file.path,
          fileSize: file.size,
          fileType: file.mimetype,
          validationStatus: 'pending',
        },
      });

      this.logger.log(`Orden médica creada exitosamente: ${order.id}`);

      return {
        success: true,
        message: 'Orden médica registrada exitosamente',
        data: {
          orderId: order.id,
          status: order.validationStatus,
        },
      };
    } catch (error) {
      this.logger.error(`Error al crear orden médica: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener todas las órdenes médicas
   */
  async getAllOrders() {
    try {
      const orders = await this.prisma.medicalOrder.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      return {
        success: true,
        data: orders.map((order) => ({
          ...order,
          requestedStudies: JSON.parse(order.requestedStudies),
        })),
      };
    } catch (error) {
      this.logger.error(`Error al obtener órdenes: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener orden por ID
   */
  async getOrderById(id: number) {
    try {
      this.logger.debug(`Buscando orden médica con ID: ${id}`);

      const order = await this.prisma.medicalOrder.findUnique({
        where: { id },
      });

      if (!order) {
        this.logger.warn(`Orden médica no encontrada con ID: ${id}`);
        return null;
      }

      this.logger.debug(`Orden encontrada: ${order.fileName}, Path: ${order.filePath}`);

      return {
        ...order,
        requestedStudies: JSON.parse(order.requestedStudies),
      };
    } catch (error) {
      this.logger.error(`Error al obtener orden: ${error.message}`);
      return null;
    }
  }

  /**
   * Obtener órdenes por DNI
   */
  async getOrdersByDNI(dni: string) {
    try {
      const orders = await this.prisma.medicalOrder.findMany({
        where: { patientDNI: dni },
        orderBy: { createdAt: 'desc' },
      });

      return {
        success: true,
        data: orders.map((order) => ({
          ...order,
          requestedStudies: JSON.parse(order.requestedStudies),
        })),
      };
    } catch (error) {
      this.logger.error(`Error al obtener órdenes por DNI: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validar o rechazar orden médica
   */
  async validateOrder(dto: ValidateMedicalOrderDto) {
    try {
      const order = await this.prisma.medicalOrder.update({
        where: { id: parseInt(dto.orderId) },
        data: {
          validationStatus: dto.validationStatus,
          validatedBy: dto.validatedBy || null,
          validatedAt: new Date(),
          rejectionReason: dto.rejectionReason || null,
        },
      });

      this.logger.log(
        `Orden ${order.id} ${dto.validationStatus === 'validated' ? 'validada' : 'rechazada'}`
      );

      return {
        success: true,
        message: `Orden médica ${dto.validationStatus === 'validated' ? 'validada' : 'rechazada'} exitosamente`,
        data: order,
      };
    } catch (error) {
      this.logger.error(`Error al validar orden: ${error.message}`);
      throw error;
    }
  }
}
