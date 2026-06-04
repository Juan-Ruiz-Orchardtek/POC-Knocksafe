import { Body, Controller, Get, Post } from '@nestjs/common';
import { AdminLoginDto, RepLoginDto } from '@knocksafe/shared/dto';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'auth-service' };
  }

  @Post('auth/admin/login')
  adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto);
  }

  @Post('auth/rep/login')
  repLogin(@Body() dto: RepLoginDto) {
    return this.authService.repLogin(dto);
  }
}
