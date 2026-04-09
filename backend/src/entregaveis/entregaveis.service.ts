import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PerfilUsuario, PrioridadeNotificacao, StatusEntregavel } from '@prisma/client';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { CreateEntregavelDto } from './dto/create-entregavel.dto';

@Injectable()
export class EntregaveisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoesService: NotificacoesService,
  ) {}

  async create(empresaId: string, data: CreateEntregavelDto) {
    await this.ensureProjeto(empresaId, data.projetoId);

    const entregavel = await this.prisma.entregavel.create({
      data: {
        empresaId,
        projetoId: data.projetoId,
        titulo: data.titulo.trim(),
        tipo: data.tipo,
        descricao: data.descricao?.trim() || null,
        dataPrevista: data.dataPrevista ? new Date(data.dataPrevista) : null,
        dataConclusao: data.dataConclusao ? new Date(data.dataConclusao) : null,
        status: data.status,
        visivelCliente: data.visivelCliente ?? true,
        observacaoInterna: data.observacaoInterna?.trim() || null,
        observacaoCliente: data.observacaoCliente?.trim() || null,
        anexoUrl: data.anexoUrl?.trim() || null,
        comentarioResumo: data.comentarioResumo?.trim() || null,
      },
      include: { projeto: true },
    });

    await this.notificarEntregavel(empresaId, entregavel.id);
    return entregavel;
  }

  async update(empresaId: string, id: string, data: Partial<CreateEntregavelDto>) {
    const atual = await this.prisma.entregavel.findFirst({ where: { id, empresaId } });
    if (!atual) throw new BadRequestException('Entregável não encontrado.');
    if (data.projetoId) await this.ensureProjeto(empresaId, data.projetoId);

    const entregavel = await this.prisma.entregavel.update({
      where: { id },
      data: {
        projetoId: data.projetoId ?? undefined,
        titulo: data.titulo?.trim() ?? undefined,
        tipo: data.tipo ?? undefined,
        descricao: data.descricao !== undefined ? data.descricao?.trim() || null : undefined,
        dataPrevista:
          data.dataPrevista !== undefined ? (data.dataPrevista ? new Date(data.dataPrevista) : null) : undefined,
        dataConclusao:
          data.dataConclusao !== undefined ? (data.dataConclusao ? new Date(data.dataConclusao) : null) : undefined,
        status: data.status ?? undefined,
        visivelCliente: data.visivelCliente !== undefined ? data.visivelCliente : undefined,
        observacaoInterna:
          data.observacaoInterna !== undefined ? data.observacaoInterna?.trim() || null : undefined,
        observacaoCliente:
          data.observacaoCliente !== undefined ? data.observacaoCliente?.trim() || null : undefined,
        anexoUrl: data.anexoUrl !== undefined ? data.anexoUrl?.trim() || null : undefined,
        comentarioResumo:
          data.comentarioResumo !== undefined ? data.comentarioResumo?.trim() || null : undefined,
      },
      include: { projeto: true },
    });

    await this.notificarEntregavel(empresaId, entregavel.id);
    return entregavel;
  }

  async remove(empresaId: string, id: string) {
    const atual = await this.prisma.entregavel.findFirst({ where: { id, empresaId } });
    if (!atual) throw new BadRequestException('Entregável não encontrado.');
    await this.prisma.entregavel.delete({ where: { id } });
    return { message: 'Entregável excluído com sucesso.' };
  }

  async findAll(user: AuthenticatedUser) {
    if (user.perfil === PerfilUsuario.CLIENTE && !user.clienteId) {
      return [];
    }

    return this.prisma.entregavel.findMany({
      where: {
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
      include: { projeto: true },
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
      include: { projeto: true },
    });

    if (!entregavel) {
      throw new BadRequestException('Entregável não encontrado.');
    }

    return entregavel;
  }


  private async notificarEntregavel(empresaId: string, entregavelId: string) {
    const entregavel = await this.prisma.entregavel.findFirst({
      where: { id: entregavelId, empresaId },
      include: { projeto: { select: { id: true, nome: true, responsavelId: true } } },
    });
    if (!entregavel) return;

    if (([StatusEntregavel.AGUARDANDO_APROVACAO, StatusEntregavel.CONCLUIDO] as StatusEntregavel[]).includes(entregavel.status as StatusEntregavel)) {
      const usuarioIds = [entregavel.projeto?.responsavelId].filter(Boolean) as string[];
      await this.notificacoesService.notificarUsuarios({
        empresaId,
        usuarioIds,
        titulo: 'Entregável atualizado',
        mensagem: `O entregável "${entregavel.titulo}" está em ${entregavel.status.toLowerCase()}.`,
        link: `/projetos/${entregavel.projetoId}/entregaveis/${entregavel.id}`,
        prioridade: PrioridadeNotificacao.MEDIA,
      });
    }
  }

  private async ensureProjeto(empresaId: string, projetoId: string) {
    const projeto = await this.prisma.projeto.findFirst({
      where: { id: projetoId, empresaId },
    });

    if (!projeto) {
      throw new BadRequestException('Projeto não encontrado para este entregável.');
    }
  }
}
