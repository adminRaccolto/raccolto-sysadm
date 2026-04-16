import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PerfilUsuario } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { BootstrapAdminDto } from './dto/bootstrap-admin.dto';
import { LoginDto } from './dto/login.dto';

const produtosPadrao = [
  { nome: 'Consultoria', contaGerencialReceita: 'Receitas / Receitas Operacionais / Consultoria', ordem: 1 },
  { nome: 'Mentoria', contaGerencialReceita: 'Receitas / Receitas Operacionais / Mentoria', ordem: 2 },
  { nome: 'Valuation', contaGerencialReceita: 'Receitas / Receitas Operacionais / Valuation', ordem: 3 },
  { nome: 'Estudo de Viabilidade', contaGerencialReceita: 'Receitas / Receitas Operacionais / Estudo de Viabilidade', ordem: 4 },
  { nome: 'Conselheiro', contaGerencialReceita: 'Receitas / Receitas Operacionais / Conselheiro', ordem: 5 },
];

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async bootstrapAdmin(dto: BootstrapAdminDto) {
    const usuariosExistentes = await this.prisma.usuario.count();

    if (usuariosExistentes > 0) {
      throw new BadRequestException(
        'O bootstrap inicial só pode ser executado quando ainda não existir usuário cadastrado.',
      );
    }

    const email = this.normalizeEmail(dto.email);
    const passwordHash = await bcrypt.hash(dto.senha, 10);

    const resultado = await this.prisma.$transaction(async (tx) => {
      const empresa = await tx.empresa.create({
        data: {
          nome: dto.empresaNome.trim(),
          nomeFantasia: dto.empresaNomeFantasia?.trim() || null,
          cnpj: dto.empresaCnpj?.trim() || null,
          email: dto.empresaEmail?.trim().toLowerCase() || null,
          telefone: dto.empresaTelefone?.trim() || null,
        },
      });

      const usuario = await tx.usuario.create({
        data: {
          empresaId: empresa.id,
          nome: dto.nome.trim(),
          email,
          passwordHash,
          perfil: PerfilUsuario.ADMIN,
        },
      });

      await tx.produtoServico.createMany({
        data: produtosPadrao.map((produto) => ({
          empresaId: empresa.id,
          nome: produto.nome,
          contaGerencialReceita: produto.contaGerencialReceita,
          ordem: produto.ordem,
        })),
      });

      return { empresa, usuario };
    });

    return {
      message: 'Bootstrap inicial concluído com sucesso.',
      empresa: resultado.empresa,
      usuario: this.toPublicUser(resultado.usuario),
    };
  }

  async login(dto: LoginDto) {
    const email = this.normalizeEmail(dto.email);

    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
      include: {
        empresa: true,
        cliente: true,
      },
    });

    if (!usuario || !usuario.ativo) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const senhaOk = await bcrypt.compare(dto.senha, usuario.passwordHash);

    if (!senhaOk) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoLoginAt: new Date() },
    });

    const payload: AuthenticatedUser = {
      id: usuario.id,
      sub: usuario.id,
      empresaId: usuario.empresaId,
      clienteId: usuario.clienteId ?? null,
      email: usuario.email,
      nome: usuario.nome,
      perfil: usuario.perfil,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      tokenType: 'Bearer',
      accessToken,
      expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
      user: this.toPublicUser(usuario),
    };
  }

  async me(user: AuthenticatedUser) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: user.id },
      include: {
        empresa: true,
        cliente: true,
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuário não encontrado.');
    }

    return this.toPublicUser(usuario);
  }

  async resetAdminTemp(email: string, novaSenha: string, chave: string) {
    if (chave !== 'raccolto-reset-2026') throw new UnauthorizedException('Não autorizado.');
    const hash = await bcrypt.hash(novaSenha, 10);
    const result = await this.prisma.usuario.updateMany({
      where: { email: email.trim().toLowerCase() },
      data: { senha: hash },
    });
    return { ok: true, updated: result.count };
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private toPublicUser(usuario: any) {
    const { passwordHash, ...rest } = usuario;
    return rest;
  }
}
