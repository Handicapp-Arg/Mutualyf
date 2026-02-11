import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserRepository } from './repositories/user.repository';
import { UserGuard } from './guards/user.guard';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UserRepository, UserGuard],
  exports: [UsersService],
})
export class UsersModule {}
