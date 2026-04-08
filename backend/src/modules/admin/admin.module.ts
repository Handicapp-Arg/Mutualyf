import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminRepository } from './repositories/admin.repository';
import { AdminGuard } from './guards/admin.guard';

@Module({
  controllers: [AdminController],
  providers: [AdminService, AdminRepository, AdminGuard],
  exports: [AdminService],
})
export class AdminModule {}
