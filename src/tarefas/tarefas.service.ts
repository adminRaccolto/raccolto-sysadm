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
import { NotificacoesService } from '../notificacoes/notificacoes.service';

@Injectable()
export class TarefasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoesService: NotificacoesService,
  ) {}

  async create(empresaId: string, data: CreateTarefaDto) {
    const projeto = await this.validateProjeto(empresaId, data.projetoId);
    const responsavel = await this.resolveResponsaveis(empresaId, data);
    const status = data.status ?? StatusTarefa.NAO_INICIADA;

    const tarefa = await this.prisma.tarefa.create({
      data: {
        empresaId,
        projetoId: projeto.id,
        atribuicaoTipo: data.atribuicaoTipo ?? TipoAtribuicaoTarefa.ANALISTA,
        responsavelUsuarioId: responsavel.responsavelUsuarioId,
        responsavelClienteId: responsavel.responsavelClienteId,
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
        visivelCliente: projeto.interno ? false : data.visivelCliente ?? false,
        concluidaEm: status === StatusTarefa.CONCLUIDA ? new Date() : null,
      },
      include: {
        ...this.defaultInclude(),
        comentarios: {
          include: {
            autorUsuario: {
              select: { id: true, nome: true, email: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    await this.notificarTarefaCriada(empresaId, tarefa.id);
    return tarefa;
  }

  async update(empresaId: string, id: string, data: Partial<CreateTarefaDto>) {
    const atual = await this.prisma.tarefa.findFirst({ where: { id, empresaId }, include: { projeto: true } });
    if (!atual) throw new BadRequestException('Tarefa não encontrada.');

    const projeto = data.projetoId ? await this.validateProjeto(empresaId, data.projetoId) : atual.projeto;
    const atribuicaoTipo = data.atribuicaoTipo ?? atual.atribuicaoTipo;
    const responsavel = await this.resolveResponsaveis(empresaId, {
      ...atual,
      ...data,
      atribuicaoTipo,
      projetoId: projeto.id,
    } as CreateTarefaDto);
    const status = data.status ?? atual.status;

    const tarefa = await this.prisma.tarefa.update({
      where: { id },
      data: {
        projetoId: projeto.id,
        atribuicaoTipo,
        responsavelUsuarioId: responsavel.responsavelUsuarioId,
        responsavelClienteId: responsavel.responsavelClienteId,
        titulo: data.titulo?.trim() ?? undefined,
        descricao: data.descricao !== undefined ? data.descricao?.trim() || null : undefined,
        anexoUrl: data.anexoUrl !== undefined ? data.anexoUrl?.trim() || null : undefined,
        comentarioResumo:
          data.comentarioResumo !== undefined ? data.comentarioResumo?.trim() || null : undefined,
        checklistHabilitado:
          data.checklistHabilitado !== undefined ? data.checklistHabilitado : undefined,
        ...(data.checklistJson !== undefined
          ? { checklistJson: data.checklistJson as Prisma.InputJsonValue }
          : {}),
        ...(data.subtarefasJson !== undefined
          ? { subtarefasJson: data.subtarefasJson as Prisma.InputJsonValue }
          : {}),
        prioridade: data.prioridade ?? undefined,
        prazo: data.prazo !== undefined ? (data.prazo ? new Date(data.prazo) : null) : undefined,
        status,
        visivelCliente:
          data.visivelCliente !== undefined ? (projeto.interno ? false : data.visivelCliente) : undefined,
        concluidaEm:
          status === StatusTarefa.CONCLUIDA
            ? atual.concluidaEm ?? new Date()
            : data.status !== undefined
              ? null
              : undefined,
      },
      include: this.defaultInclude(),
    });

    await this.notificarTarefaAtualizada(empresaId, tarefa.id, atual.comentarioResumo, data.comentarioResumo);
    return tarefa;
  }

  async remove(empresaId: string, id: string) {
    const tarefa = await this.prisma.tarefa.findFirst({ where: { id, empresaId } });
    if (!tarefa) throw new BadRequestException('Tarefa não encontrada.');
    await this.prisma.tarefa.delete({ where: { id } });
    return { message: 'Tarefa excluída com sucesso.' };
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
      include: {
        ...this.defaultInclude(),
        comentarios: {
          include: {
            autorUsuario: { select: { id: true, nome: true, email: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!tarefa) {
      throw new BadRequestException('Tarefa não encontrada.');
    }

    return tarefa;
  }


  private async notificarTarefaCriada(empresaId: string, tarefaId: string) {
    const tarefa = await this.prisma.tarefa.findFirst({
      where: { id: tarefaId, empresaId },
      include: { projeto: { select: { id: true, nome: true, responsavelId: true } } },
    });
    if (!tarefa) return;

    const usuarioIds = [tarefa.responsavelUsuarioId, tarefa.projeto?.responsavelId].filter(Boolean) as string[];
    await this.notificacoesService.notificarUsuarios({
      empresaId,
      usuarioIds,
      titulo: 'Nova tarefa atribuída',
      mensagem: `A tarefa "${tarefa.titulo}" foi registrada no projeto ${tarefa.projeto?.nome || ''}.`,
      link: `/projetos/${tarefa.projetoId}/tarefas/${tarefa.id}`,
    });
  }

  private async notificarTarefaAtualizada(empresaId: string, tarefaId: string, comentarioAnterior?: string | null, comentarioNovo?: string | null) {
    const tarefa = await this.prisma.tarefa.findFirst({
      where: { id: tarefaId, empresaId },
      include: { projeto: { select: { id: true, nome: true, responsavelId: true } } },
    });
    if (!tarefa) return;

    if (comentarioNovo !== undefined && comentarioNovo !== comentarioAnterior && comentarioNovo?.trim()) {
      const usuarioIds = [tarefa.responsavelUsuarioId, tarefa.projeto?.responsavelId].filter(Boolean) as string[];
      await this.notificacoesService.notificarUsuarios({
        empresaId,
        usuarioIds,
        titulo: 'Novo comentário na tarefa',
        mensagem: `A tarefa "${tarefa.titulo}" recebeu um novo comentário.`,
        link: `/projetos/${tarefa.projetoId}/tarefas/${tarefa.id}`,
      });
    }
  }


  async addComentario(user: AuthenticatedUser, id: string, mensagem: string) {
    const tarefa = await this.prisma.tarefa.findFirst({
      where: { id, empresaId: user.empresaId },
      include: { projeto: { select: { id: true, nome: true, responsavelId: true } } },
    });
    if (!tarefa) throw new BadRequestException('Tarefa não encontrada.');

    const comentario = await this.prisma.tarefaComentario.create({
      data: {
        empresaId: user.empresaId,
        tarefaId: tarefa.id,
        autorUsuarioId: user.id,
        autorNome: user.nome,
        mensagem: mensagem.trim(),
      },
      include: {
        autorUsuario: { select: { id: true, nome: true, email: true } },
      },
    });

    const usuarioIds = [tarefa.responsavelUsuarioId, tarefa.projeto?.responsavelId]
      .filter(Boolean)
      .filter((item) => item !== user.id) as string[];

    await this.notificacoesService.notificarUsuarios({
      empresaId: user.empresaId,
      usuarioIds,
      titulo: 'Novo comentário na tarefa',
      mensagem: `${user.nome} comentou em "${tarefa.titulo}".`,
      link: `/projetos/${tarefa.projetoId}/tarefas/${tarefa.id}`,
    });

    return comentario;
  }

  private async validateProjeto(empresaId: string, projetoId: string) {
    const projeto = await this.prisma.projeto.findFirst({
      where: { id: projetoId, empresaId },
    });
    if (!projeto) throw new BadRequestException('Projeto não encontrado nesta empresa.');
    return projeto;
  }

  private async resolveResponsaveis(empresaId: string, data: CreateTarefaDto) {
    const atribuicaoTipo = data.atribuicaoTipo ?? TipoAtribuicaoTarefa.ANALISTA;
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
          throw new BadRequestException('Analista responsável não encontrado ou inativo.');
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

    return { responsavelUsuarioId, responsavelClienteId };
  }

  private defaultInclude() {
    return {
      projeto: {
        select: {
          id: true,
          nome: true,
          clienteId: true,
          visivelCliente: true,
          interno: true,
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
