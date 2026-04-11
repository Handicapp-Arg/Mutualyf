import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto, UpdateRoleDto, UpdatePermissionMatrixDto } from './dto/role.dto';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PermissionCode } from '../auth/constants/permissions.enum';

@UseGuards(PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @RequirePermissions(PermissionCode.ROLES_READ)
  @Get()
  async findAll() {
    return this.rolesService.findAll();
  }

  @RequirePermissions(PermissionCode.ROLES_READ)
  @Get('permissions/all')
  async getAllPermissions() {
    return this.rolesService.getAllPermissions();
  }

  @RequirePermissions(PermissionCode.ROLES_READ)
  @Get('matrix')
  async getPermissionMatrix() {
    return this.rolesService.getPermissionMatrix();
  }

  @RequirePermissions(PermissionCode.ROLES_MANAGE)
  @Put('matrix')
  async updatePermissionMatrix(@Body() dto: UpdatePermissionMatrixDto) {
    return this.rolesService.updatePermissionMatrix(dto);
  }

  @RequirePermissions(PermissionCode.ROLES_READ)
  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.findById(id);
  }

  @RequirePermissions(PermissionCode.ROLES_MANAGE)
  @Post()
  async create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @RequirePermissions(PermissionCode.ROLES_MANAGE)
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rolesService.update(id, dto);
  }

  @RequirePermissions(PermissionCode.ROLES_MANAGE)
  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.delete(id);
  }
}
