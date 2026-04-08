import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class CreateMedicalOrderDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @IsNotEmpty()
  patientDNI: string;

  @IsString()
  @IsNotEmpty()
  patientName: string;

  @IsString()
  @IsOptional()
  patientPhone?: string;

  @IsString()
  @IsNotEmpty()
  orderDate: string;

  @IsString()
  @IsOptional()
  doctorName?: string;

  @IsString()
  @IsOptional()
  doctorLicense?: string;

  @IsString()
  @IsOptional()
  healthInsurance?: string;

  @IsArray()
  @IsNotEmpty()
  requestedStudies: string[];
}

export class ValidateMedicalOrderDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsNotEmpty()
  validationStatus: 'validated' | 'rejected';

  @IsString()
  @IsOptional()
  validatedBy?: string;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
