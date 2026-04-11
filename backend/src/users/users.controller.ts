import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import {
  CreateUserIdentityDto,
  UpdateUserNameDto,
} from './dto/user-identity.dto';
import { Public } from '../auth/decorators/public.decorator';

@Public()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Buscar usuario por fingerprint
   * GET /api/users/fingerprint/:fingerprint
   */
  @Get('fingerprint/:fingerprint')
  @HttpCode(HttpStatus.OK)
  async findByFingerprint(@Param('fingerprint') fingerprint: string) {
    return this.usersService.findByFingerprint(fingerprint);
  }

  /**
   * Buscar usuario por dirección IP
   * GET /api/users/ip/:ip
   * Retorna null si no se encuentra (para usuarios nuevos)
   */
  @Get('ip/:ip')
  @HttpCode(HttpStatus.OK)
  async findByIp(@Param('ip') ip: string) {
    const user = await this.usersService.findByIp(ip);
    return { data: user };  // Devolver formato consistente
  }

  /**
   * Crear o actualizar identidad de usuario
   * POST /api/users/identity
   */
  @Post('identity')
  @HttpCode(HttpStatus.OK)
  async saveIdentity(@Body() dto: CreateUserIdentityDto) {
    return this.usersService.createOrUpdate({
      ipAddress: dto.ipAddress,
      fingerprint: dto.fingerprint,
      userName: dto.userName,
      userAgent: dto.userAgent,
      timezone: dto.timezone,
      language: dto.language,
      firstVisit: dto.firstVisit,
      lastVisit: dto.lastVisit,
    });
  }

  /**
   * Actualizar nombre de usuario
   * PUT /api/users/name
   */
  @Put('name')
  @HttpCode(HttpStatus.OK)
  async updateName(@Body() dto: UpdateUserNameDto) {
    return this.usersService.updateName(dto.fingerprint, dto.userName);
  }

  /**
   * Obtener estadísticas de usuarios
   * GET /api/users/stats
   */
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async getStats() {
    return this.usersService.getStats();
  }
}
