import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

type JwtPayload = {
  sub: string;
  empresaId: string;
  clienteId?: string | null;
  email: string;
  nome: string;
  perfil: 'ADMIN' | 'ANALISTA' | 'CLIENTE';
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request.headers?.authorization);

    if (!token) {
      throw new UnauthorizedException('Token de acesso não informado.');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: process.env.JWT_SECRET ?? 'raccolto-dev-secret-change-me',
      });

      const usuario = await this.prisma.usuario.findUnique({
        where: { id: payload.sub },
      });

      if (!usuario || !usuario.ativo) {
        throw new UnauthorizedException('Usuário inválido ou inativo.');
      }

      const authUser: AuthenticatedUser = {
        id: usuario.id,
        sub: usuario.id,
        empresaId: usuario.empresaId,
        clienteId: usuario.clienteId ?? null,
        email: usuario.email,
        nome: usuario.nome,
        perfil: usuario.perfil,
      };

      request.user = authUser;
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado.');
    }
  }

  private extractToken(authorization?: string): string | null {
    if (!authorization) {
      return null;
    }

    const [type, token] = authorization.split(' ');

    if (type !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }
}
