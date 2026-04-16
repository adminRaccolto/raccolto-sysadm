import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { AuthService } from './auth.service';
import { BootstrapAdminDto } from './dto/bootstrap-admin.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('bootstrap')
  async bootstrap(@Body() dto: BootstrapAdminDto) {
    return this.authService.bootstrapAdmin(dto);
  }

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('reset-admin-temp')
  async resetAdminTemp(@Body() body: { email: string; novaSenha: string; chave: string }) {
    return this.authService.resetAdminTemp(body.email, body.novaSenha, body.chave);
  }

  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user);
  }
}
