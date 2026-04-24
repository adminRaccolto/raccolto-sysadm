import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PerfilUsuario, StatusEntregavel, StatusProjeto, StatusTarefa } from '@prisma/client';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjetoDto } from './dto/create-projeto.dto';

@Injectable()
export class ProjetosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(empresaId: string, data: CreateProjetoDto) {
    const cliente = await this.prisma.cliente.findFirst({
      where: {
        id: data.clienteId,
        empresaId,
      },
    });

    if (!cliente) {
      throw new BadRequestException('Cliente não encontrado nesta empresa.');
    }

    let contratoId: string | null = null;
    if (data.contratoId) {
      const contrato = await this.prisma.contrato.findFirst({
        where: {
          id: data.contratoId,
          empresaId,
          clienteId: data.clienteId,
        },
      });

      if (!contrato) {
        throw new BadRequestException(
          'Contrato não encontrado para o cliente informado.',
        );
      }

      contratoId = contrato.id;
    }

    let produtoServicoId: string | null = null;
    if (data.produtoServicoId) {
      const produto = await this.prisma.produtoServico.findFirst({
        where: { id: data.produtoServicoId, empresaId },
      });
      if (!produto) {
        throw new BadRequestException('Produto/serviço não encontrado nesta empresa.');
      }
      produtoServicoId = produto.id;
    }

    let responsavelId: string | null = null;
    if (data.responsavelId) {
      const usuario = await this.prisma.usuario.findFirst({
        where: {
          id: data.responsavelId,
          empresaId,
          ativo: true,
        },
      });

      if (!usuario) {
        throw new BadRequestException(
          'Responsável não encontrado ou inativo nesta empresa.',
        );
      }

      responsavelId = usuario.id;
    }

    let gerenteId: string | null = null;
    if (data.gerenteId) {
      const gerente = await this.prisma.usuario.findFirst({
        where: { id: data.gerenteId, empresaId, ativo: true },
      });
      if (!gerente) {
        throw new BadRequestException('Gerente não encontrado ou inativo nesta empresa.');
      }
      gerenteId = gerente.id;
    }

    const projeto = await this.prisma.projeto.create({
      data: {
        empresaId,
        clienteId: data.clienteId,
        contratoId,
        produtoServicoId,
        responsavelId,
        gerenteId,
        cor: data.cor || null,
        nome: data.nome.trim(),
        descricao: data.descricao?.trim() || null,
        equipeEnvolvida: data.equipeEnvolvida?.trim() || null,
        tipoServicoProjeto: data.tipoServicoProjeto?.trim() || null,
        faseAtual: data.faseAtual?.trim() || null,
        percentualAndamento: data.percentualAndamento ?? 0,
        prioridade: data.prioridade,
        recorrente: data.recorrente ?? false,
        checklistInicialHabilitado: data.checklistInicialHabilitado ?? false,
        modeloPadraoNome: data.modeloPadraoNome?.trim() || null,
        dataInicio: new Date(data.dataInicio),
        dataFimPrevista: data.dataFimPrevista
          ? new Date(data.dataFimPrevista)
          : null,
        dataInicioReal: data.dataInicioReal ? new Date(data.dataInicioReal) : null,
        dataFimReal: data.dataFimReal ? new Date(data.dataFimReal) : null,
        status: data.status,
        visivelCliente: data.visivelCliente ?? true,
      },
      include: this.defaultInclude(),
    });

    if (data.membroIds && data.membroIds.length > 0) {
      await this.prisma.projetoMembro.createMany({
        data: data.membroIds.map((usuarioId) => ({ projetoId: projeto.id, usuarioId })),
        skipDuplicates: true,
      });
    }

    return this.prisma.projeto.findFirst({
      where: { id: projeto.id },
      include: this.defaultInclude(),
    });
  }

  async findAll(user: AuthenticatedUser) {
    if (user.perfil === PerfilUsuario.CLIENTE && !user.clienteId) {
      return [];
    }

    const where =
      user.perfil === PerfilUsuario.CLIENTE
        ? {
            empresaId: user.empresaId,
            clienteId: user.clienteId!,
            visivelCliente: true,
          }
        : {
            empresaId: user.empresaId,
          };

    return this.prisma.projeto.findMany({
      where,
      include: this.defaultInclude(),
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(user: AuthenticatedUser, id: string) {
    if (user.perfil === PerfilUsuario.CLIENTE && !user.clienteId) {
      throw new ForbiddenException('Cliente sem vínculo operacional definido.');
    }

    const projeto = await this.prisma.projeto.findFirst({
      where:
        user.perfil === PerfilUsuario.CLIENTE
          ? {
              id,
              empresaId: user.empresaId,
              clienteId: user.clienteId!,
              visivelCliente: true,
            }
          : {
              id,
              empresaId: user.empresaId,
            },
      include: {
        ...this.defaultInclude(),
        tarefas: {
          where:
            user.perfil === PerfilUsuario.CLIENTE
              ? { visivelCliente: true }
              : undefined,
          orderBy: [{ prazo: 'asc' }, { createdAt: 'desc' }],
        },
        entregaveis: {
          where:
            user.perfil === PerfilUsuario.CLIENTE
              ? { visivelCliente: true }
              : undefined,
          orderBy: [{ dataPrevista: 'asc' }, { createdAt: 'desc' }],
        },
      },
    });

    if (!projeto) {
      throw new BadRequestException('Projeto não encontrado.');
    }

    return projeto;
  }

  async getPainelOperacional(user: AuthenticatedUser) {
  if (user.perfil === PerfilUsuario.CLIENTE && !user.clienteId) {
    throw new ForbiddenException('Cliente sem vínculo operacional definido.');
  }

  const hoje = new Date();
  const em7Dias = new Date();
  em7Dias.setDate(hoje.getDate() + 7);

  const statusTarefasAbertas: StatusTarefa[] = [
    StatusTarefa.NAO_INICIADA,
    StatusTarefa.INICIADA,
    StatusTarefa.AGUARDANDO_APROVACAO,
  ];

  const whereBase =
    user.perfil === PerfilUsuario.CLIENTE
      ? {
          empresaId: user.empresaId,
          clienteId: user.clienteId!,
          visivelCliente: true,
        }
      : { empresaId: user.empresaId };

  const [
    projetosAtivos,
    projetosAguardandoCliente,
    tarefasEmAtraso,
    entregaveisPendentes,
    tarefas,
    entregaveis,
  ] = await Promise.all([
    this.prisma.projeto.count({
      where: {
        ...whereBase,
        status: StatusProjeto.EM_ANDAMENTO,
      },
    }),
    this.prisma.projeto.count({
      where: {
        ...whereBase,
        status: StatusProjeto.AGUARDANDO_CLIENTE,
      },
    }),
    this.prisma.tarefa.count({
      where: {
        empresaId: user.empresaId,
        prazo: { lt: hoje },
        status: { in: statusTarefasAbertas },
        ...(user.perfil === PerfilUsuario.CLIENTE
          ? {
              visivelCliente: true,
              projeto: { clienteId: user.clienteId! },
            }
          : {}),
      },
    }),
    this.prisma.entregavel.count({
      where: {
        empresaId: user.empresaId,
        status: {
          in: [
            StatusEntregavel.PLANEJADO,
            StatusEntregavel.EM_PRODUCAO,
            StatusEntregavel.EM_REVISAO,
            StatusEntregavel.AGUARDANDO_APROVACAO,
          ],
        },
        ...(user.perfil === PerfilUsuario.CLIENTE
          ? {
              visivelCliente: true,
              projeto: { clienteId: user.clienteId! },
            }
          : {}),
      },
    }),
    this.prisma.tarefa.findMany({
      where: {
        empresaId: user.empresaId,
        prazo: { gte: hoje, lte: em7Dias },
        status: { in: statusTarefasAbertas },
        ...(user.perfil === PerfilUsuario.CLIENTE
          ? {
              visivelCliente: true,
              projeto: { clienteId: user.clienteId! },
            }
          : {}),
      },
      include: {
        projeto: { select: { id: true, nome: true } },
      },
      orderBy: { prazo: 'asc' },
      take: 5,
    }),
    this.prisma.entregavel.findMany({
      where: {
        empresaId: user.empresaId,
        dataPrevista: { gte: hoje, lte: em7Dias },
        status: {
          in: [
            StatusEntregavel.PLANEJADO,
            StatusEntregavel.EM_PRODUCAO,
            StatusEntregavel.EM_REVISAO,
            StatusEntregavel.AGUARDANDO_APROVACAO,
          ],
        },
        ...(user.perfil === PerfilUsuario.CLIENTE
          ? {
              visivelCliente: true,
              projeto: { clienteId: user.clienteId! },
            }
          : {}),
      },
      include: {
        projeto: { select: { id: true, nome: true } },
      },
      orderBy: { dataPrevista: 'asc' },
      take: 5,
    }),
  ]);

  return {
    escopo: user.perfil === PerfilUsuario.CLIENTE ? 'cliente' : 'interno',
    indicadores: {
      projetosAtivos,
      projetosAguardandoCliente,
      tarefasEmAtraso,
      entregaveisPendentes,
    },
    proximosPrazos: {
      tarefas,
      entregaveis,
    },
  };
}

  private defaultInclude() {
    return {
      cliente: {
        select: { id: true, razaoSocial: true, nomeFantasia: true },
      },
      responsavel: {
        select: { id: true, nome: true, email: true },
      },
      gerente: {
        select: { id: true, nome: true, email: true },
      },
      membros: {
        include: {
          usuario: { select: { id: true, nome: true, email: true } },
        },
      },
    };
  }
}