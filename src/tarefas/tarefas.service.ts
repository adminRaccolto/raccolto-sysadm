import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  PerfilUsuario,
  Prisma,
  StatusTarefa,
  TipoAtribuicaoTarefa,
} from '@prisma/client';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTarefaDto } from './dto/create-tarefa.dto';

@Injectable()
export class TarefasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(empresaId: string, data: CreateTarefaDto) {
    const projeto = await this.prisma.projeto.findFirst({
      where: {
        id: data.projetoId,
        empresaId,
      },
    });

    if (!projeto) {
      throw new BadRequestException('Projeto não encontrado nesta empresa.');
    }

    const atribuicaoTipo =
      data.atribuicaoTipo ?? TipoAtribuicaoTarefa.ANALISTA;

    let responsavelUsuarioId: string | null = null;
    let responsavelClienteId: string | null = null;

    if (atribuicaoTipo === TipoAtribuicaoTarefa.ANALISTA) {
      if (data.responsavelUsuarioId) {
        const usuario = await this.prisma.usuario.findFirst({
          where: {
            id: data.responsavelUsuarioId,
            empresaId,
            ativo: true,
          },
        });

        if (!usuario) {
          throw new BadRequestException(
            'Analista responsável não encontrado ou inativo.',
          );
        }

        responsavelUsuarioId = usuario.id;
      }
    } else {
      if (data.responsavelClienteId) {
        const cliente = await this.prisma.cliente.findFirst({
          where: {
            id: data.responsavelClienteId,
            empresaId,
          },
        });

        if (!cliente) {
          throw new BadRequestException('Cliente responsável não encontrado.');
        }

        responsavelClienteId = cliente.id;
      }
    }

    const status = data.status ?? StatusTarefa.NAO_INICIADA;

    return this.prisma.tarefa.create({
      data: {
        empresaId,
        projetoId: projeto.id,
        atribuicaoTipo,
        responsavelUsuarioId,
        responsavelClienteId,
        titulo: data.titulo.trim(),
        descricao: data.descricao?.trim() || null,
        anexoUrl: data.anexoUrl?.trim() || null,
        comentarioResumo: data.comentarioResumo?.trim() || null,
        checklistHabilitado: data.checklistHabilitado ?? false,
        ...(data.checklistJson !== undefined
          ? { checklistJson: data.checklistJson as Prisma.InputJsonValue }
          : {}),
        ...(data.subtarefasJson !== undefined
          ? { subtarefasJson: data.subtarefasJson as Prisma.InputJsonValue }
          : {}),
        prioridade: data.prioridade,
        prazo: data.prazo ? new Date(data.prazo) : null,
        status,
        visivelCliente: data.visivelCliente ?? false,
        concluidaEm:
          status === StatusTarefa.CONCLUIDA ? new Date() : null,
      },
      include: this.defaultInclude(),
    });
  }

  async findAll(
    user: AuthenticatedUser,
    filtros: { projetoId?: string; status?: string; atribuidoA?: string },
  ) {
    if (user.perfil === PerfilUsuario.CLIENTE && !user.clienteId) {
      return [];
    }

    return this.prisma.tarefa.findMany({
      where: {
        empresaId: user.empresaId,
        ...(filtros.projetoId ? { projetoId: filtros.projetoId } : {}),
        ...(filtros.status
          ? { status: filtros.status as StatusTarefa }
          : {}),
        ...(filtros.atribuidoA
          ? {
              OR: [
                { responsavelUsuarioId: filtros.atribuidoA },
                { responsavelClienteId: filtros.atribuidoA },
              ],
            }
          : {}),
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
      orderBy: [{ prazo: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(user: AuthenticatedUser, id: string) {
    if (user.perfil === PerfilUsuario.CLIENTE && !user.clienteId) {
      throw new ForbiddenException('Cliente sem vínculo operacional definido.');
    }

    const tarefa = await this.prisma.tarefa.findFirst({
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

    if (!tarefa) {
      throw new BadRequestException('Tarefa não encontrada.');
    }

    return tarefa;
  }

  async findMinhas(user: AuthenticatedUser) {
    return this.prisma.tarefa.findMany({
      where: {
        empresaId: user.empresaId,
        responsavelUsuarioId: user.id,
        status: {
          in: [
            StatusTarefa.NAO_INICIADA,
            StatusTarefa.INICIADA,
            StatusTarefa.AGUARDANDO_APROVACAO,
          ],
        },
      },
      include: this.defaultInclude(),
      orderBy: [{ prazo: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async update(user: AuthenticatedUser, id: string, data: Partial<CreateTarefaDto>) {
    const tarefa = await this.prisma.tarefa.findFirst({
      where: { id, empresaId: user.empresaId },
    });
    if (!tarefa) throw new BadRequestException('Tarefa não encontrada.');

    return this.prisma.tarefa.update({
      where: { id },
      data: {
        ...(data.titulo ? { titulo: data.titulo.trim() } : {}),
        ...(data.descricao !== undefined ? { descricao: data.descricao?.trim() || null } : {}),
        ...(data.status !== undefined ? {
          status: data.status,
          concluidaEm: data.status === StatusTarefa.CONCLUIDA ? new Date() : undefined,
        } : {}),
        ...(data.prioridade !== undefined ? { prioridade: data.prioridade } : {}),
        ...(data.prazo !== undefined ? { prazo: data.prazo ? new Date(data.prazo) : null } : {}),
        ...(data.responsavelUsuarioId !== undefined ? { responsavelUsuarioId: data.responsavelUsuarioId || null } : {}),
        ...(data.responsavelClienteId !== undefined ? { responsavelClienteId: data.responsavelClienteId || null } : {}),
        ...(data.visivelCliente !== undefined ? { visivelCliente: data.visivelCliente } : {}),
        ...(data.comentarioResumo !== undefined ? { comentarioResumo: data.comentarioResumo?.trim() || null } : {}),
      },
      include: this.defaultInclude(),
    });
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
      responsavelUsuario: {
        select: {
          id: true,
          nome: true,
          email: true,
          perfil: true,
        },
      },
      responsavelCliente: {
        select: {
          id: true,
          razaoSocial: true,
          cpfCnpj: true,
        },
      },
    };
  }
}
