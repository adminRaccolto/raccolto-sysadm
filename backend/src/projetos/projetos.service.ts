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
    const interno = data.interno ?? false;

    let clienteId: string;
    if (interno) {
      const clienteInterno = await this.resolveClienteInterno(empresaId);
      clienteId = clienteInterno.id;
    } else {
      if (!data.clienteId) {
        throw new BadRequestException('Cliente é obrigatório para projetos externos.');
      }

      const cliente = await this.prisma.cliente.findFirst({
        where: {
          id: data.clienteId,
          empresaId,
        },
      });

      if (!cliente) {
        throw new BadRequestException('Cliente não encontrado nesta empresa.');
      }

      clienteId = cliente.id;
    }

    let contratoId: string | null = null;
    let produtoServicoId: string | null = null;
    let dataInicio = data.dataInicio ? new Date(data.dataInicio) : null;
    let dataFimPrevista = data.dataFimPrevista ? new Date(data.dataFimPrevista) : null;

    if (data.contratoId && !interno) {
      const contrato = await this.prisma.contrato.findFirst({
        where: {
          id: data.contratoId,
          empresaId,
          clienteId,
        },
      });

      if (!contrato) {
        throw new BadRequestException(
          'Contrato não encontrado para o cliente informado.',
        );
      }

      contratoId = contrato.id;
      produtoServicoId = contrato.produtoServicoId ?? null;
      dataInicio = contrato.dataInicio;
      dataFimPrevista = contrato.dataFim ?? null;
    } else if (data.produtoServicoId) {
      const produto = await this.prisma.produtoServico.findFirst({
        where: { id: data.produtoServicoId, empresaId },
      });
      if (!produto) {
        throw new BadRequestException('Produto/serviço não encontrado nesta empresa.');
      }
      produtoServicoId = produto.id;
    }

    if (!dataInicio) {
      throw new BadRequestException('Data de início é obrigatória para o projeto.');
    }

    const responsavelId = await this.resolveResponsavel(empresaId, data.responsavelId);

    return this.prisma.projeto.create({
      data: {
        empresaId,
        clienteId,
        contratoId,
        produtoServicoId,
        responsavelId,
        interno,
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
        dataInicio,
        dataFimPrevista,
        dataInicioReal: data.dataInicioReal ? new Date(data.dataInicioReal) : null,
        dataFimReal: data.dataFimReal ? new Date(data.dataFimReal) : null,
        status: data.status,
        visivelCliente: interno ? false : data.visivelCliente ?? true,
      },
      include: this.defaultInclude(),
    });
  }

  async update(empresaId: string, id: string, data: Partial<CreateProjetoDto>) {
    const atual = await this.prisma.projeto.findFirst({ where: { id, empresaId } });
    if (!atual) {
      throw new BadRequestException('Projeto não encontrado.');
    }

    const interno = data.interno ?? atual.interno;
    let clienteId = atual.clienteId;
    let contratoId: string | null | undefined = undefined;
    let produtoServicoId: string | null | undefined = undefined;
    let dataInicio: Date | null | undefined = undefined;
    let dataFimPrevista: Date | null | undefined = undefined;

    if (interno) {
      const clienteInterno = await this.resolveClienteInterno(empresaId);
      clienteId = clienteInterno.id;
      contratoId = null;
      produtoServicoId = data.produtoServicoId !== undefined ? null : undefined;
    } else {
      if (data.clienteId) {
        const cliente = await this.prisma.cliente.findFirst({
          where: { id: data.clienteId, empresaId },
        });
        if (!cliente) throw new BadRequestException('Cliente não encontrado nesta empresa.');
        clienteId = cliente.id;
      }

      if (data.contratoId !== undefined) {
        if (!data.contratoId) {
          contratoId = null;
        } else {
          const contrato = await this.prisma.contrato.findFirst({
            where: { id: data.contratoId, empresaId, clienteId },
          });
          if (!contrato) {
            throw new BadRequestException('Contrato não encontrado para o cliente informado.');
          }
          contratoId = contrato.id;
          produtoServicoId = contrato.produtoServicoId ?? null;
          dataInicio = contrato.dataInicio;
          dataFimPrevista = contrato.dataFim ?? null;
        }
      }

      if (data.produtoServicoId !== undefined && contratoId !== atual.contratoId) {
        if (!data.produtoServicoId) {
          produtoServicoId = null;
        } else {
          const produto = await this.prisma.produtoServico.findFirst({
            where: { id: data.produtoServicoId, empresaId },
          });
          if (!produto) {
            throw new BadRequestException('Produto/serviço não encontrado nesta empresa.');
          }
          produtoServicoId = produto.id;
        }
      }
    }

    if (data.dataInicio !== undefined && data.dataInicio) {
      dataInicio = new Date(data.dataInicio);
    }
    if (data.dataFimPrevista !== undefined) {
      dataFimPrevista = data.dataFimPrevista ? new Date(data.dataFimPrevista) : null;
    }

    const responsavelId =
      data.responsavelId !== undefined
        ? await this.resolveResponsavel(empresaId, data.responsavelId)
        : undefined;

    await this.prisma.projeto.update({
      where: { id },
      data: {
        clienteId,
        contratoId,
        produtoServicoId,
        responsavelId,
        interno,
        nome: data.nome?.trim() ?? undefined,
        descricao: data.descricao !== undefined ? data.descricao?.trim() || null : undefined,
        equipeEnvolvida:
          data.equipeEnvolvida !== undefined ? data.equipeEnvolvida?.trim() || null : undefined,
        tipoServicoProjeto:
          data.tipoServicoProjeto !== undefined ? data.tipoServicoProjeto?.trim() || null : undefined,
        faseAtual: data.faseAtual !== undefined ? data.faseAtual?.trim() || null : undefined,
        percentualAndamento:
          data.percentualAndamento !== undefined ? data.percentualAndamento : undefined,
        prioridade: data.prioridade ?? undefined,
        recorrente: data.recorrente !== undefined ? data.recorrente : undefined,
        checklistInicialHabilitado:
          data.checklistInicialHabilitado !== undefined ? data.checklistInicialHabilitado : undefined,
        modeloPadraoNome:
          data.modeloPadraoNome !== undefined ? data.modeloPadraoNome?.trim() || null : undefined,
        dataInicio,
        dataFimPrevista,
        dataInicioReal:
          data.dataInicioReal !== undefined ? (data.dataInicioReal ? new Date(data.dataInicioReal) : null) : undefined,
        dataFimReal:
          data.dataFimReal !== undefined ? (data.dataFimReal ? new Date(data.dataFimReal) : null) : undefined,
        status: data.status ?? undefined,
        visivelCliente: interno ? false : data.visivelCliente !== undefined ? data.visivelCliente : undefined,
      },
      include: this.defaultInclude(),
    });

    return this.findOne({ id: '', sub: '', empresaId, clienteId: null, email: '', nome: '', perfil: PerfilUsuario.ADMIN } as AuthenticatedUser, id);
  }

  async remove(empresaId: string, id: string) {
    const projeto = await this.prisma.projeto.findFirst({
      where: { id, empresaId },
      include: { _count: { select: { tarefas: true, entregaveis: true } } },
    });

    if (!projeto) {
      throw new BadRequestException('Projeto não encontrado.');
    }

    if (projeto._count.tarefas > 0 || projeto._count.entregaveis > 0) {
      throw new BadRequestException(
        'Este projeto já possui tarefas ou entregáveis. Altere o status em vez de excluir.',
      );
    }

    await this.prisma.projeto.delete({ where: { id } });
    return { message: 'Projeto excluído com sucesso.' };
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

    const isCliente = user.perfil === PerfilUsuario.CLIENTE;
    const where = isCliente
      ? { id, empresaId: user.empresaId, clienteId: user.clienteId!, visivelCliente: true as const }
      : { id, empresaId: user.empresaId };

    const projetoRaw = await this.prisma.projeto.findFirst({ where });
    if (!projetoRaw) throw new BadRequestException('Projeto não encontrado.');

    const projeto = await this.loadProjetoDetalhado(projetoRaw.id, isCliente);
    if (!projeto) throw new BadRequestException('Projeto não encontrado.');

    const hoje = new Date();
    const tarefas = (projeto as any).tarefas ?? [];
    const tarefasAIniciar = tarefas.filter((t: any) => t.status === StatusTarefa.NAO_INICIADA).length;
    const tarefasAtrasadas = tarefas.filter(
      (t: any) => t.prazo && new Date(t.prazo) < hoje &&
        [StatusTarefa.NAO_INICIADA, StatusTarefa.EM_ANDAMENTO, StatusTarefa.AGUARDANDO].includes(t.status),
    ).length;
    const totalTarefas = tarefas.length;
    const concluidas = tarefas.filter((t: any) => t.status === StatusTarefa.CONCLUIDA).length;
    const percentualConclusao = totalTarefas > 0
      ? Math.round((concluidas / totalTarefas) * 100)
      : (projeto as any).percentualAndamento ?? 0;

    return Object.assign({}, projeto, {
      painel: { tarefasAIniciar, tarefasAtrasadas, percentualConclusao, totalTarefas },
    });
  }

  private async resolveClienteInterno(empresaId: string) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      select: {
        nome: true,
        email: true,
        telefone: true,
      },
    });

    if (!empresa) {
      throw new BadRequestException('Empresa não encontrada para criar projeto interno.');
    }

    const razaoSocial = `[INTERNO] ${empresa.nome}`;
    const existente = await this.prisma.cliente.findFirst({
      where: {
        empresaId,
        razaoSocial,
      },
    });

    if (existente) {
      return existente;
    }

    return this.prisma.cliente.create({
      data: {
        empresaId,
        razaoSocial,
        nomeFantasia: empresa.nome,
        email: empresa.email,
        telefone: empresa.telefone,
        contatoPrincipal: 'Uso interno Raccolto',
      },
    });
  }

  private async resolveResponsavel(empresaId: string, responsavelId?: string | null) {
    if (!responsavelId) return null;

    const usuario = await this.prisma.usuario.findFirst({
      where: {
        id: responsavelId,
        empresaId,
        ativo: true,
      },
    });

    if (!usuario) {
      throw new BadRequestException('Responsável não encontrado ou inativo nesta empresa.');
    }

    return usuario.id;
  }

  async getPainelOperacional(user: AuthenticatedUser) {
    if (user.perfil === PerfilUsuario.CLIENTE && !user.clienteId) {
      throw new ForbiddenException('Cliente sem vínculo operacional definido.');
    }

    const hoje = new Date();
    const em7Dias = new Date();
    em7Dias.setDate(hoje.getDate() + 7);

    const whereBase =
      user.perfil === PerfilUsuario.CLIENTE
        ? {
            empresaId: user.empresaId,
            clienteId: user.clienteId!,
            visivelCliente: true,
          }
        : { empresaId: user.empresaId };

    const [projetosAtivos, projetosAguardandoCliente, tarefasEmAtraso, entregaveisPendentes, tarefas, entregaveis] =
      await Promise.all([
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
            status: {
              in: [StatusTarefa.NAO_INICIADA, StatusTarefa.EM_ANDAMENTO, StatusTarefa.AGUARDANDO],
            },
            prazo: { lt: hoje },
            projeto: whereBase,
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
            projeto: whereBase,
          },
        }),
        this.prisma.tarefa.findMany({
          where: {
            empresaId: user.empresaId,
            prazo: { gte: hoje, lte: em7Dias },
            status: {
              in: [StatusTarefa.NAO_INICIADA, StatusTarefa.EM_ANDAMENTO, StatusTarefa.AGUARDANDO],
            },
            projeto: whereBase,
          },
          include: {
            projeto: true,
            responsavelUsuario: true,
            responsavelCliente: true,
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
            projeto: whereBase,
          },
          include: {
            projeto: true,
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

  private async loadProjetoDetalhado(id: string, isCliente: boolean) {
    if (isCliente) {
      return this.prisma.projeto.findFirst({
        where: { id },
        include: {
          cliente: true, contrato: true, produtoServico: true,
          responsavel: { select: { id: true, nome: true, email: true, perfil: true } },
          _count: { select: { tarefas: true, entregaveis: true, documentos: true } },
          tarefas: { where: { visivelCliente: true }, include: { responsavelUsuario: { select: { id: true, nome: true, email: true, perfil: true } }, labels: { include: { label: true } } }, orderBy: [{ ordem: 'asc' }, { prazo: 'asc' }, { createdAt: 'desc' }] },
          entregaveis: { where: { visivelCliente: true }, orderBy: [{ dataPrevista: 'asc' }, { createdAt: 'desc' }] },
          documentos: { where: { visivelCliente: true }, orderBy: [{ updatedAt: 'desc' }] },
          etapas: { orderBy: { ordem: 'asc' } },
        },
      });
    }
    return this.prisma.projeto.findFirst({
      where: { id },
      include: {
        cliente: true, contrato: true, produtoServico: true,
        responsavel: { select: { id: true, nome: true, email: true, perfil: true } },
        _count: { select: { tarefas: true, entregaveis: true, documentos: true } },
        tarefas: { include: { responsavelUsuario: { select: { id: true, nome: true, email: true, perfil: true } }, labels: { include: { label: true } } }, orderBy: [{ ordem: 'asc' }, { prazo: 'asc' }, { createdAt: 'desc' }] },
        entregaveis: { orderBy: [{ dataPrevista: 'asc' }, { createdAt: 'desc' }] },
        documentos: { orderBy: [{ updatedAt: 'desc' }] },
        etapas: { orderBy: { ordem: 'asc' } },
      },
    });
  }

  private defaultInclude() {
    return {
      cliente: true,
      contrato: true,
      produtoServico: true,
      responsavel: {
        select: {
          id: true,
          nome: true,
          email: true,
          perfil: true,
        },
      },
      _count: {
        select: {
          tarefas: true,
          entregaveis: true,
          documentos: true,
        },
      },
    };
  }
}
