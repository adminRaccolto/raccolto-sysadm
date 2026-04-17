import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PerfilUsuario, PrismaClient, StatusEmpresa } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PerfisAcessoService } from '../perfis-acesso/perfis-acesso.service';
import { PrismaService } from '../prisma/prisma.service';
import { ensurePlanoContasPadrao } from '../financeiro/plano-contas.seed';
import { ensureContratoModelosPadrao } from '../contratos/contrato-modelos.seed';
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
    private readonly perfisAcessoService: PerfisAcessoService,
  ) {}

  async listEmpresasLogin() {
    const empresas = await this.prisma.empresa.findMany({
      where: { status: StatusEmpresa.ATIVA },
      select: {
        id: true,
        nome: true,
        nomeFantasia: true,
        logoUrl: true,
      },
      orderBy: [{ nomeFantasia: 'asc' }, { nome: 'asc' }],
    });

    return {
      itens: empresas,
      total: empresas.length,
    };
  }

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
          logradouro: dto.empresaLogradouro?.trim() || null,
          numero: dto.empresaNumero?.trim() || null,
          complemento: dto.empresaComplemento?.trim() || null,
          bairro: dto.empresaBairro?.trim() || null,
          cidade: dto.empresaCidade?.trim() || null,
          estado: dto.empresaEstado?.trim() || null,
          cep: dto.empresaCep?.trim() || null,
          representanteNome: dto.empresaRepresentanteNome?.trim() || null,
          representanteCargo: dto.empresaRepresentanteCargo?.trim() || null,
          logoUrl: dto.empresaLogoUrl?.trim() || null,
        },
      });

      await this.perfisAcessoService.ensurePerfisPadraoEmpresa(empresa.id, tx as PrismaClient);
      const perfilAdmin = await tx.perfilAcesso.findFirst({
        where: { empresaId: empresa.id, nome: 'Administrador' },
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

      await tx.usuarioEmpresa.create({
        data: {
          usuarioId: usuario.id,
          empresaId: empresa.id,
          principal: true,
          ativo: true,
          perfilAcessoId: perfilAdmin?.id ?? null,
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

      await ensurePlanoContasPadrao(tx as any, empresa.id);
      await ensureContratoModelosPadrao(tx as any, empresa.id);

      return { empresa, usuario };
    });

    return {
      message: 'Bootstrap inicial concluído com sucesso.',
      empresa: resultado.empresa,
      usuario: await this.buildPublicUser(resultado.usuario.id, resultado.empresa.id),
    };
  }

  async login(dto: LoginDto) {
    const email = this.normalizeEmail(dto.email);

    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
      include: {
        empresa: true,
        cliente: true,
        empresaAcessos: {
          where: { ativo: true },
          include: {
            empresa: true,
            perfilAcesso: true,
          },
        },
      },
    });

    if (!usuario || !usuario.ativo) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const senhaOk = await bcrypt.compare(dto.senha, usuario.passwordHash);
    if (!senhaOk) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const acesso = usuario.empresaAcessos.find((item) => item.empresaId === dto.empresaId && item.ativo);
    if (!acesso) {
      throw new UnauthorizedException('Usuário sem acesso à empresa selecionada.');
    }

    await this.ensureUserAccessBaseline(usuario.id, acesso.empresaId, usuario.perfil);

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoLoginAt: new Date() },
    });

    const accessToken = await this.signForCompany(usuario.id, acesso.empresaId);

    return {
      tokenType: 'Bearer',
      accessToken,
      expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
      user: await this.buildPublicUser(usuario.id, acesso.empresaId),
    };
  }

  async switchCompany(user: AuthenticatedUser, empresaId: string) {
    const acesso = await this.prisma.usuarioEmpresa.findFirst({
      where: {
        usuarioId: user.id,
        empresaId,
        ativo: true,
      },
    });

    if (!acesso) {
      throw new UnauthorizedException('Usuário sem acesso à empresa informada.');
    }

    const accessToken = await this.signForCompany(user.id, empresaId);

    return {
      tokenType: 'Bearer',
      accessToken,
      expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
      user: await this.buildPublicUser(user.id, empresaId),
    };
  }

  async me(user: AuthenticatedUser) {
    return this.buildPublicUser(user.id, user.empresaId);
  }

  private async signForCompany(userId: string, empresaId: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: userId } });
    if (!usuario) throw new UnauthorizedException('Usuário não encontrado.');

    const acesso = await this.prisma.usuarioEmpresa.findFirst({
      where: { usuarioId: userId, empresaId, ativo: true },
      include: { perfilAcesso: true },
    });

    const payload: AuthenticatedUser = {
      id: usuario.id,
      sub: usuario.id,
      empresaId,
      clienteId: usuario.clienteId ?? null,
      email: usuario.email,
      nome: usuario.nome,
      perfil: usuario.perfil,
      perfilAcessoId: acesso?.perfilAcessoId ?? null,
    };

    return this.jwtService.signAsync(payload);
  }

  private async buildPublicUser(userId: string, empresaId: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
      include: {
        cliente: true,
        empresaAcessos: {
          where: { ativo: true },
          include: {
            empresa: true,
            perfilAcesso: true,
          },
          orderBy: [{ principal: 'desc' }, { empresa: { nome: 'asc' } }],
        },
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuário não encontrado.');
    }

    const empresaAtual = usuario.empresaAcessos.find((item) => item.empresaId === empresaId)?.empresa;
    const perfilAtual = usuario.empresaAcessos.find((item) => item.empresaId === empresaId)?.perfilAcesso;

    const { passwordHash, ...rest } = usuario as any;
    return {
      ...rest,
      empresaId,
      empresa: empresaAtual ?? null,
      perfilAcessoAtual: perfilAtual
        ? { id: perfilAtual.id, nome: perfilAtual.nome, descricao: perfilAtual.descricao }
        : null,
      empresasDisponiveis: usuario.empresaAcessos.map((item) => ({
        id: item.empresa.id,
        nome: item.empresa.nome,
        nomeFantasia: item.empresa.nomeFantasia,
        logoUrl: item.empresa.logoUrl,
        perfilAcesso: item.perfilAcesso
          ? { id: item.perfilAcesso.id, nome: item.perfilAcesso.nome }
          : null,
        principal: item.principal,
      })),
    };
  }

  private async ensureUserAccessBaseline(userId: string, empresaId: string, perfil: PerfilUsuario) {
    await this.perfisAcessoService.ensurePerfisPadraoEmpresa(empresaId);

    const existente = await this.prisma.usuarioEmpresa.findFirst({
      where: { usuarioId: userId, empresaId },
    });

    if (existente) return;

    const perfilNome = perfil === PerfilUsuario.ADMIN ? 'Administrador' : perfil === PerfilUsuario.CLIENTE ? 'Cliente' : 'Analista';
    const perfilAcesso = await this.prisma.perfilAcesso.findFirst({
      where: { empresaId, nome: perfilNome },
    });

    await this.prisma.usuarioEmpresa.create({
      data: {
        usuarioId: userId,
        empresaId,
        principal: true,
        ativo: true,
        perfilAcessoId: perfilAcesso?.id ?? null,
      },
    });
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }
}
