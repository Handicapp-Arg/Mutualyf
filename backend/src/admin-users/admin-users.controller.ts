import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AdminUsersService } from './admin-users.service';
import { CreateAdminUserDto, UpdateAdminUserDto } from './dto/create-admin-user.dto';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PermissionCode } from '../auth/constants/permissions.enum';

@UseGuards(PermissionsGuard)
@Controller('admin-users')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @RequirePermissions(PermissionCode.USERS_READ)
  @Get()
  async findAll() {
    return this.adminUsersService.findAll();
  }

  @RequirePermissions(PermissionCode.USERS_READ)
  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.adminUsersService.findById(id);
  }

  @RequirePermissions(PermissionCode.USERS_MANAGE)
  @Post()
  async create(@Body() dto: CreateAdminUserDto) {
    return this.adminUsersService.create(dto);
  }

  @RequirePermissions(PermissionCode.USERS_MANAGE)
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAdminUserDto,
  ) {
    return this.adminUsersService.update(id, dto);
  }

  @RequirePermissions(PermissionCode.USERS_MANAGE)
  @Patch(':id/toggle-active')
  async toggleActive(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.adminUsersService.toggleActive(id, user.id);
  }
}
