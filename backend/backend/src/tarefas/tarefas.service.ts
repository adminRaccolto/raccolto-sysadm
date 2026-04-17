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
import { StorageService } from '../storage/storage.service';

const STATUSES_ABERTAS = [
  StatusTarefa.NAO_INICIADA,
  StatusTarefa.INICIADA,
  StatusTarefa.AGUARDANDO_APROVACAO,
] as StatusTarefa[];

@Injectable()
export class TarefasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoesService: NotificacoesService,
    private readonly storageService: StorageService,
  ) {}

  async create(empresaId: string, data: CreateTarefaDto, autorNome?: string) {
    const projeto = await this.validateProjeto(empresaId, data.projetoId);
    const responsavel = await this.resolveResponsaveis(empresaId, data);
    const status = data.status ?? StatusTarefa.NAO_INICIADA;

    const tarefa = await this.prisma.tarefa.create({
      data: {
        empresaId,
        projetoId: projeto.id,
        etapaId: data.etapaId ?? null,
        atribuicaoTipo: data.atribuicaoTipo ?? TipoAtribuicaoTarefa.ANALISTA,
        responsavelUsuarioId: responsavel.responsavelUsuarioId,
        responsavelClienteId: responsavel.responsavelClienteId,
        titulo: data.titulo.trim(),
        descricao: data.descricao?.trim() || null,
        anexoUrl: data.anexoUrl?.trim() || null,
        comentarioResumo: data.comentarioResumo?.trim() || null,
        checklistHabilitado: data.checklistHabilitado ?? false,
        ...(data.checklistJson !== undefined ? { checklistJson: data.checklistJson as Prisma.InputJsonValue } : {}),
        ...(data.subtarefasJson !== undefined ? { subtarefasJson: data.subtarefasJson as Prisma.InputJsonValue } : {}),
        prioridade: data.prioridade,
        prazo: data.prazo ? new Date(data.prazo) : null,
        estimativaHoras: data.estimativaHoras ?? null,
        horasRegistradas: data.horasRegistradas ?? 0,
        ordem: data.ordem ?? 0,
        status,
        aprovadorTipo: data.aprovadorTipo ?? null,
        aprovadorUsuarioId: data.aprovadorUsuarioId ?? null,
        visivelCliente: projeto.interno ? false : data.visivelCliente ?? false,
        concluidaEm: status === StatusTarefa.CONCLUIDA ? new Date() : null,
      },
      include: this.fullInclude(),
    });

    if (autorNome) {
      await this.registrarAtividade(tarefa.id, empresaId, autorNome, 'CRIADA', `Tarefa criada no projeto ${projeto.nome}`);
    }
    await this.notificarTarefaCriada(empresaId, tarefa.id);
    return tarefa;
  }

  async update(empresaId: string, id: string, data: Partial<CreateTarefaDto>, autorNome?: string) {
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
        etapaId: data.etapaId !== undefined ? data.etapaId : undefined,
        atribuicaoTipo,
        responsavelUsuarioId: responsavel.responsavelUsuarioId,
        responsavelClienteId: responsavel.responsavelClienteId,
        titulo: data.titulo?.trim() ?? undefined,
        descricao: data.descricao !== undefined ? data.descricao?.trim() || null : undefined,
        anexoUrl: data.anexoUrl !== undefined ? data.anexoUrl?.trim() || null : undefined,
        comentarioResumo: data.comentarioResumo !== undefined ? data.comentarioResumo?.trim() || null : undefined,
        checklistHabilitado: data.checklistHabilitado !== undefined ? data.checklistHabilitado : undefined,
        ...(data.checklistJson !== undefined ? { checklistJson: data.checklistJson as Prisma.InputJsonValue } : {}),
        ...(data.subtarefasJson !== undefined ? { subtarefasJson: data.subtarefasJson as Prisma.InputJsonValue } : {}),
        prioridade: data.prioridade ?? undefined,
        prazo: data.prazo !== undefined ? (data.prazo ? new Date(data.prazo) : null) : undefined,
        estimativaHoras: data.estimativaHoras !== undefined ? data.estimativaHoras : undefined,
        horasRegistradas: data.horasRegistradas !== undefined ? data.horasRegistradas : undefined,
        ordem: data.ordem !== undefined ? data.ordem : undefined,
        status,
        aprovadorTipo: data.aprovadorTipo !== undefined ? data.aprovadorTipo || null : undefined,
        aprovadorUsuarioId: data.aprovadorUsuarioId !== undefined ? data.aprovadorUsuarioId || null : undefined,
        visivelCliente: data.visivelCliente !== undefined ? (projeto.interno ? false : data.visivelCliente) : undefined,
        concluidaEm:
          status === StatusTarefa.CONCLUIDA
            ? atual.concluidaEm ?? new Date()
            : data.status !== undefined
              ? null
              : undefined,
      },
      include: this.fullInclude(),
    });

    // Track activity on important field changes
    if (autorNome) {
      if (data.status && data.status !== atual.status) {
        const labels: Record<string, string> = {
          NAO_INICIADA: 'Não Iniciada', INICIADA: 'Iniciada',
          AGUARDANDO_APROVACAO: 'Aguardando Aprovação', CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada',
        };
        await this.registrarAtividade(id, empresaId, autorNome, 'STATUS_ALTERADO',
          `Status alterado de "${labels[atual.status] ?? atual.status}" para "${labels[data.status] ?? data.status}"`);
      }
      if (data.etapaId !== undefined && data.etapaId !== atual.etapaId) {
        await this.registrarAtividade(id, empresaId, autorNome, 'ETAPA_ALTERADA', 'Tarefa movida para outra etapa');
      }
      if (data.responsavelUsuarioId !== undefined && data.responsavelUsuarioId !== atual.responsavelUsuarioId) {
        await this.registrarAtividade(id, empresaId, autorNome, 'RESPONSAVEL_ALTERADO', 'Responsável atualizado');
      }
    }

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
    filtros: { projetoId?: string; etapaId?: string; status?: string; atribuidoA?: string },
  ) {
    if (user.perfil === PerfilUsuario.CLIENTE && !user.clienteId) return [];

    return this.prisma.tarefa.findMany({
      where: {
        empresaId: user.empresaId,
        ...(filtros.projetoId ? { projetoId: filtros.projetoId } : {}),
        ...(filtros.etapaId !== undefined
          ? filtros.etapaId === 'backlog' ? { etapaId: null } : { etapaId: filtros.etapaId }
          : {}),
        ...(filtros.status ? { status: filtros.status as StatusTarefa } : {}),
        ...(filtros.atribuidoA ? { OR: [{ responsavelUsuarioId: filtros.atribuidoA }, { responsavelClienteId: filtros.atribuidoA }] } : {}),
        ...(user.perfil === PerfilUsuario.CLIENTE
          ? { visivelCliente: true, projeto: { clienteId: user.clienteId! } }
          : {}),
      },
      include: {
        ...this.defaultInclude(),
        etapa: { select: { id: true, nome: true, status: true, cor: true } } as any,
        labels: { include: { label: true } },
      },
      orderBy: [{ ordem: 'asc' }, { prazo: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findMinhas(user: AuthenticatedUser) {
    if (user.perfil === PerfilUsuario.CLIENTE) {
      return this.prisma.tarefa.findMany({
        where: {
          empresaId: user.empresaId,
          responsavelClienteId: user.clienteId ?? undefined,
          visivelCliente: true,
          status: { in: STATUSES_ABERTAS },
        },
        include: {
          ...this.defaultInclude(),
          labels: { include: { label: true } },
        },
        orderBy: [{ prazo: 'asc' }, { prioridade: 'desc' }],
      });
    }

    return this.prisma.tarefa.findMany({
      where: {
        empresaId: user.empresaId,
        responsavelUsuarioId: user.id,
        status: { in: STATUSES_ABERTAS },
      },
      include: {
        ...this.defaultInclude(),
        labels: { include: { label: true } },
      },
      orderBy: [{ prazo: 'asc' }, { prioridade: 'desc' }],
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
          ? { visivelCliente: true, projeto: { clienteId: user.clienteId! } }
          : {}),
      },
      include: {
        ...this.fullInclude(),
        atividades: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    if (!tarefa) throw new BadRequestException('Tarefa não encontrada.');
    return tarefa;
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
      include: { autorUsuario: { select: { id: true, nome: true, email: true } } },
    });

    await this.registrarAtividade(id, user.empresaId, user.nome, 'COMENTARIO', mensagem.trim().slice(0, 120));

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

  async adicionarLabel(empresaId: string, tarefaId: string, labelId: string) {
    const tarefa = await this.prisma.tarefa.findFirst({ where: { id: tarefaId, empresaId } });
    if (!tarefa) throw new BadRequestException('Tarefa não encontrada.');
    const label = await this.prisma.tarefaLabel.findFirst({ where: { id: labelId, empresaId } });
    if (!label) throw new BadRequestException('Label não encontrada.');

    await this.prisma.tarefaLabelVinculo.upsert({
      where: { tarefaId_labelId: { tarefaId, labelId } },
      create: { tarefaId, labelId },
      update: {},
    });
    return { message: 'Label adicionada.' };
  }

  async removerLabel(empresaId: string, tarefaId: string, labelId: string) {
    const tarefa = await this.prisma.tarefa.findFirst({ where: { id: tarefaId, empresaId } });
    if (!tarefa) throw new BadRequestException('Tarefa não encontrada.');
    await this.prisma.tarefaLabelVinculo.deleteMany({ where: { tarefaId, labelId } });
    return { message: 'Label removida.' };
  }

  async adicionarAnexo(user: AuthenticatedUser, tarefaId: string, file: Express.Multer.File) {
    const tarefa = await this.prisma.tarefa.findFirst({ where: { id: tarefaId, empresaId: user.empresaId } });
    if (!tarefa) throw new BadRequestException('Tarefa não encontrada.');
    if (!file) throw new BadRequestException('Arquivo não enviado.');

    const url = await this.storageService.uploadFile(file.buffer, file.originalname, file.mimetype, 'tarefas');
    const anexo = await this.prisma.tarefaAnexo.create({
      data: {
        tarefaId,
        nome: file.originalname,
        url,
        tipo: file.mimetype,
        tamanho: file.size,
        autorNome: user.nome,
      },
    });
    await this.registrarAtividade(tarefaId, user.empresaId, user.nome, 'ANEXO_ADICIONADO', file.originalname);
    return anexo;
  }

  async removerAnexo(empresaId: string, tarefaId: string, anexoId: string) {
    const tarefa = await this.prisma.tarefa.findFirst({ where: { id: tarefaId, empresaId } });
    if (!tarefa) throw new BadRequestException('Tarefa não encontrada.');
    const anexo = await this.prisma.tarefaAnexo.findFirst({ where: { id: anexoId, tarefaId } });
    if (!anexo) throw new BadRequestException('Anexo não encontrado.');
    await this.prisma.tarefaAnexo.delete({ where: { id: anexoId } });
    return { message: 'Anexo removido.' };
  }

  async registrarHoras(empresaId: string, tarefaId: string, horas: number) {
    const tarefa = await this.prisma.tarefa.findFirst({ where: { id: tarefaId, empresaId } });
    if (!tarefa) throw new BadRequestException('Tarefa não encontrada.');
    return this.prisma.tarefa.update({
      where: { id: tarefaId },
      data: { horasRegistradas: { increment: horas } },
      select: { id: true, horasRegistradas: true, estimativaHoras: true },
    });
  }

  // Labels CRUD
  async findLabels(empresaId: string) {
    return this.prisma.tarefaLabel.findMany({
      where: { empresaId },
      include: { _count: { select: { vinculos: true } } },
      orderBy: { nome: 'asc' },
    });
  }

  async createLabel(empresaId: string, nome: string, cor: string) {
    return this.prisma.tarefaLabel.create({
      data: { empresaId, nome: nome.trim(), cor },
    });
  }

  async updateLabel(empresaId: string, id: string, nome?: string, cor?: string) {
    const label = await this.prisma.tarefaLabel.findFirst({ where: { id, empresaId } });
    if (!label) throw new BadRequestException('Label não encontrada.');
    return this.prisma.tarefaLabel.update({
      where: { id },
      data: { nome: nome?.trim() ?? undefined, cor: cor ?? undefined },
    });
  }

  async removeLabel(empresaId: string, id: string) {
    const label = await this.prisma.tarefaLabel.findFirst({ where: { id, empresaId } });
    if (!label) throw new BadRequestException('Label não encontrada.');
    await this.prisma.tarefaLabel.delete({ where: { id } });
    return { message: 'Label excluída.' };
  }

  private async registrarAtividade(tarefaId: string, empresaId: string, autorNome: string, tipo: string, detalhe?: string) {
    try {
      await this.prisma.tarefaAtividade.create({
        data: { tarefaId, empresaId, autorNome, tipo, detalhe: detalhe ?? null },
      });
    } catch {
      // non-critical, ignore
    }
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

  private async validateProjeto(empresaId: string, projetoId: string) {
    const projeto = await this.prisma.projeto.findFirst({ where: { id: projetoId, empresaId } });
    if (!projeto) throw new BadRequestException('Projeto não encontrado nesta empresa.');
    return projeto;
  }

  private async resolveResponsaveis(empresaId: string, data: CreateTarefaDto) {
    const atribuicaoTipo = data.atribuicaoTipo ?? TipoAtribuicaoTarefa.ANALISTA;
    let responsavelUsuarioId: string | null = null;
    let responsavelClienteId: string | null = null;

    if (atribuicaoTipo === TipoAtribuicaoTarefa.ANALISTA) {
      if (data.responsavelUsuarioId) {
        const usuario = await this.prisma.usuario.findFirst({ where: { id: data.responsavelUsuarioId, empresaId, ativo: true } });
        if (!usuario) throw new BadRequestException('Analista responsável não encontrado ou inativo.');
        responsavelUsuarioId = usuario.id;
      }
    } else {
      if (data.responsavelClienteId) {
        const cliente = await this.prisma.cliente.findFirst({ where: { id: data.responsavelClienteId, empresaId } });
        if (!cliente) throw new BadRequestException('Cliente responsável não encontrado.');
        responsavelClienteId = cliente.id;
      }
    }

    return { responsavelUsuarioId, responsavelClienteId };
  }

  private defaultInclude() {
    return {
      projeto: {
        select: { id: true, nome: true, clienteId: true, visivelCliente: true, interno: true },
      },
      responsavelUsuario: {
        select: { id: true, nome: true, email: true, perfil: true },
      },
      responsavelCliente: {
        select: { id: true, razaoSocial: true, cpfCnpj: true },
      },
    };
  }

  private fullInclude() {
    return {
      ...this.defaultInclude(),
      etapa: { select: { id: true, nome: true, status: true, cor: true } },
      labels: { include: { label: true } },
      anexos: { orderBy: { createdAt: 'asc' as const } },
      aprovadorUsuario: { select: { id: true, nome: true, email: true } },
      comentarios: {
        include: { autorUsuario: { select: { id: true, nome: true, email: true } } },
        orderBy: { createdAt: 'asc' as const },
      },
    };
  }
}
