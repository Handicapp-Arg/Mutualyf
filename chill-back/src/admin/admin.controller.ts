import { Controller, Get, Res, Header } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Página de administración con botón para borrar DB y cookies
   * GET /api/admin
   */
  @Get()
  @Header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'")
  async adminPage(@Res() res: Response) {
    res.type('html').send('<!DOCTYPE html><html><head><title>Admin</title></head><body></body></html>');
  }
}
