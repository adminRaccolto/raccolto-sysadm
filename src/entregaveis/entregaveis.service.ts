import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PerfilUsuario } from '@prisma/client';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEntregavelDto } from './dto/create-entregavel.dto';

@Injectable()
export class EntregaveisService {
  constructor(private readonly prisma: PrismaService) {}

  async create(empresaId: string, data: CreateEntregavelDto) {
    const projeto = await this.prisma.projeto.findFirst({
      where: {
        id: data.projetoId,
        empresaId,
      },
    });

    if (!projeto) {
      throw new BadRequestException('Projeto não encontrado nesta empresa.');
    }

    return this.prisma.entregavel.create({
      data: {
        empresaId,
        projetoId: projeto.id,
        titulo: data.titulo.trim(),
        tipo: data.tipo,
        descricao: data.descricao?.trim() || null,
        dataPrevista: data.dataPrevista ? new Date(data.dataPrevista) : null,
        dataConclusao: data.dataConclusao ? new Date(data.dataConclusao) : null,
        status: data.status,
        visivelCliente: data.visivelCliente ?? true,
        observacaoInterna: data.observacaoInterna?.trim() || null,
        observacaoCliente: data.observacaoCliente?.trim() || null,
      },
      include: this.defaultInclude(),
    });
  }

  async findAll(user: AuthenticatedUser, projetoId?: string) {
    if (user.perfil === PerfilUsuario.CLIENTE && !user.clienteId) {
      return [];
    }

    return this.prisma.entregavel.findMany({
      where: {
        empresaId: user.empresaId,
        ...(projetoId ? { projetoId } : {}),
        ...(user.perfil === PerfilUsuario.CLIENTE
          ? {
              visivelCliente: true,
              projeto: {
                clienteId: user.clienteId!,
              },
            }
          : {}),
      },
      include: this.defaultInclude(),
      orderBy: [{ dataPrevista: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(user: AuthenticatedUser, id: string) {
    if (user.perfil === PerfilUsuario.CLIENTE && !user.clienteId) {
      throw new ForbiddenException('Cliente sem vínculo operacional definido.');
    }

    const entregavel = await this.prisma.entregavel.findFirst({
      where: {
        id,
        empresaId: user.empresaId,
        ...(user.perfil === PerfilUsuario.CLIENTE
          ? {
              visivelCliente: true,
              projeto: {
                clienteId: user.clienteId!,
              },
            }
          : {}),
      },
      include: this.defaultInclude(),
    });

    if (!entregavel) {
      throw new BadRequestException('Entregável não encontrado.');
    }

    return entregavel;
  }

  private defaultInclude() {
    return {
      projeto: {
        select: {
          id: true,
          nome: true,
          clienteId: true,
          visivelCliente: true,
        },
      },
    };
  }
}
