import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Excepción para errores de lógica de negocio
 */
export class BusinessException extends HttpException {
  constructor(message: string, details?: any) {
    super(
      {
        success: false,
        message,
        error: 'Business Logic Error',
        details,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

/**
 * Excepción para recursos no encontrados
 */
export class ResourceNotFoundException extends HttpException {
  constructor(resource: string, identifier: string | number) {
    super(
      {
        success: false,
        message: `${resource} con identificador '${identifier}' no encontrado`,
        error: 'Resource Not Found',
        resource,
        identifier,
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * Excepción para recursos duplicados
 */
export class DuplicateResourceException extends HttpException {
  constructor(resource: string, field: string, value: any) {
    super(
      {
        success: false,
        message: `${resource} con ${field} '${value}' ya existe`,
        error: 'Duplicate Resource',
        resource,
        field,
        value,
      },
      HttpStatus.CONFLICT,
    );
  }
}

/**
 * Excepción para errores de base de datos
 */
export class DatabaseException extends HttpException {
  constructor(operation: string, details?: any) {
    super(
      {
        success: false,
        message: `Error en operación de base de datos: ${operation}`,
        error: 'Database Error',
        details: process.env.NODE_ENV !== 'production' ? details : undefined,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
