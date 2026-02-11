import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserGuard } from './guards/user.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(UserGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':fingerprint')
  async findByFingerprint(@Param('fingerprint') fingerprint: string) {
    return this.usersService.findByFingerprint(fingerprint);
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }
}
