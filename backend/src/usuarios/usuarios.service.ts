import { BadRequestException, Injectable } from '@nestjs/common';
import { PerfilUsuario } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PerfisAcessoService } from '../perfis-acesso/perfis-acesso.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly perfisAcessoService: PerfisAcessoService,
  ) {}

  async create(empresaId: string, data: CreateUsuarioDto) {
    const email = data.email.trim().toLowerCase();

    const existente = await this.prisma.usuario.findUnique({ where: { email } });
    if (existente) {
      throw new BadRequestException('Já existe um usuário com este e-mail.');
    }

    if (data.perfil === PerfilUsuario.CLIENTE && !data.clienteId) {
      throw new BadRequestException(
        'Usuários com perfil CLIENTE precisam estar vinculados a um cliente.',
      );
    }

    if (data.clienteId) {
      const cliente = await this.prisma.cliente.findFirst({ where: { id: data.clienteId, empresaId } });
      if (!cliente) throw new BadRequestException('Cliente informado não encontrado nesta empresa.');
    }

    await this.perfisAcessoService.ensurePerfisPadraoEmpresa(empresaId);

    const passwordHash = await bcrypt.hash(data.senha, 10);
    const empresaIds = Array.from(new Set([empresaId, ...(data.empresaIdsAcesso ?? [])]));

    const usuario = await this.prisma.$transaction(async (tx) => {
      const criado = await tx.usuario.create({
        data: {
          empresaId,
          clienteId: data.clienteId ?? null,
          nome: data.nome.trim(),
          email,
          passwordHash,
          perfil: data.perfil,
          ativo: data.ativo ?? true,
        },
      });

      for (const alvoEmpresaId of empresaIds) {
        const empresa = await tx.empresa.findUnique({ where: { id: alvoEmpresaId } });
        if (!empresa) continue;

        let perfilAcessoId = data.perfilAcessoId ?? null;
        if (!perfilAcessoId) {
          const nomePerfil = data.perfil === PerfilUsuario.ADMIN ? 'Administrador' : data.perfil === PerfilUsuario.CLIENTE ? 'Cliente' : 'Analista';
          const perfil = await tx.perfilAcesso.findFirst({ where: { empresaId: alvoEmpresaId, nome: nomePerfil } });
          perfilAcessoId = perfil?.id ?? null;
        }

        await tx.usuarioEmpresa.create({
          data: {
            usuarioId: criado.id,
            empresaId: alvoEmpresaId,
            perfilAcessoId,
            principal: alvoEmpresaId === empresaId,
            ativo: true,
          },
        });
      }

      return criado;
    });

    return this.findOneForAdmin(usuario.id, empresaId);
  }

  async findAll(empresaId: string) {
    const usuarios = await this.prisma.usuario.findMany({
      where: { empresaAcessos: { some: { empresaId, ativo: true } } },
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
      orderBy: { createdAt: 'desc' },
    });

    return usuarios.map((usuario) => this.toPublicUser(usuario, empresaId));
  }

  async findOneForAdmin(usuarioId: string, empresaId: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
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
    if (!usuario) throw new BadRequestException('Usuário não encontrado.');
    return this.toPublicUser(usuario, empresaId);
  }

  private toPublicUser(usuario: any, empresaId: string) {
    const { passwordHash, ...rest } = usuario;
    const acessoAtual = usuario.empresaAcessos?.find((item: any) => item.empresaId === empresaId);
    return {
      ...rest,
      empresaId,
      perfilAcessoAtual: acessoAtual?.perfilAcesso ?? null,
      empresasDisponiveis: (usuario.empresaAcessos ?? []).map((item: any) => ({
        id: item.empresa.id,
        nome: item.empresa.nome,
        nomeFantasia: item.empresa.nomeFantasia,
        principal: item.principal,
        perfilAcesso: item.perfilAcesso ?? null,
      })),
    };
  }
}
