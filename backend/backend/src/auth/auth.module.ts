import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PerfisAcessoModule } from '../perfis-acesso/perfis-acesso.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    PerfisAcessoModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'raccolto-dev-secret-change-me',
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRES_IN ?? '8h') as any,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
