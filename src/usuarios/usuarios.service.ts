import { BadRequestException, Injectable } from '@nestjs/common';
import { PerfilUsuario } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(empresaId: string, data: CreateUsuarioDto) {
    const email = data.email.trim().toLowerCase();

    const existente = await this.prisma.usuario.findUnique({
      where: { email },
    });

    if (existente) {
      throw new BadRequestException('Já existe um usuário com este e-mail.');
    }

    if (data.perfil === PerfilUsuario.CLIENTE && !data.clienteId) {
      throw new BadRequestException(
        'Usuários com perfil CLIENTE precisam estar vinculados a um cliente.',
      );
    }

    if (data.clienteId) {
      const cliente = await this.prisma.cliente.findFirst({
        where: {
          id: data.clienteId,
          empresaId,
        },
      });

      if (!cliente) {
        throw new BadRequestException('Cliente informado não encontrado nesta empresa.');
      }
    }

    const passwordHash = await bcrypt.hash(data.senha, 10);

    const usuario = await this.prisma.usuario.create({
      data: {
        empresaId,
        clienteId: data.clienteId ?? null,
        nome: data.nome.trim(),
        email,
        passwordHash,
        perfil: data.perfil,
        ativo: data.ativo ?? true,
      },
      include: {
        empresa: true,
        cliente: true,
      },
    });

    return this.toPublicUser(usuario);
  }

  async findAll(empresaId: string) {
    const usuarios = await this.prisma.usuario.findMany({
      where: { empresaId },
      include: {
        empresa: true,
        cliente: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return usuarios.map((usuario) => this.toPublicUser(usuario));
  }

  private toPublicUser(usuario: any) {
    const { passwordHash, ...rest } = usuario;
    return rest;
  }
}
