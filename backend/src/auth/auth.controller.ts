import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @UseGuards(AuthGuard('local'))
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('login')
  async login(@CurrentUser() user: any) {
    return this.authService.login(user);
  }

  @Get('profile')
  async getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.id);
  }

  @Put('change-password')
  async changePassword(
    @CurrentUser() user: any,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }
}
