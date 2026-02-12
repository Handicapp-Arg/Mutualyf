import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminGuard } from './guards/admin.guard';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get(':email')
  async findByEmail(@Param('email') email: string) {
    return this.adminService.findByEmail(email);
  }

  @Post()
  async create(@Body() dto: CreateAdminDto) {
    return this.adminService.create(dto);
  }
}
