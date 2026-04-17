import { BadRequestException, Injectable } from '@nestjs/common';
import { EtapaCrm, PerfilUsuario, Prisma, StatusContrato, StatusProjeto } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { CreateOportunidadeDto } from './dto/create-oportunidade.dto';
import { ConvertOportunidadeDto } from './dto/convert-oportunidade.dto';

@Injectable()
export class CrmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoesService: NotificacoesService,
  ) {}

  private include() {
    return {
      cliente: true,
      produtoServico: true,
      responsavel: {
        select: { id: true, nome: true, email: true, perfil: true },
      },
      comentarios: {
        include: {
          autorUsuario: {
            select: { id: true, nome: true, email: true },
          },
        },
        orderBy: { createdAt: 'asc' as Prisma.SortOrder },
      },
    };
  }

  async findAll(empresaId: string, filtros?: { etapa?: string; responsavelId?: string; produtoServicoId?: string }) {
    return this.prisma.oportunidadeCrm.findMany({
      where: {
        empresaId,
        ...(filtros?.etapa ? { etapa: filtros.etapa as EtapaCrm } : {}),
        ...(filtros?.responsavelId ? { responsavelId: filtros.responsavelId } : {}),
        ...(filtros?.produtoServicoId ? { produtoServicoId: filtros.produtoServicoId } : {}),
      },
      include: this.include(),
      orderBy: [{ updatedAt: 'desc' }],
    });
  }


  async findOne(empresaId: string, id: string) {
    const oportunidade = await this.prisma.oportunidadeCrm.findFirst({
      where: { id, empresaId },
      include: this.include(),
    });

    if (!oportunidade) throw new BadRequestException('Oportunidade não encontrada.');
    return oportunidade;
  }

  async create(empresaId: string, data: CreateOportunidadeDto) {
    await this.validateRelations(empresaId, data);

    return this.prisma.oportunidadeCrm.create({
      data: {
        empresaId,
        clienteId: data.clienteId ?? null,
        produtoServicoId: data.produtoServicoId ?? null,
        responsavelId: data.responsavelId ?? null,
        titulo: data.titulo.trim(),
        empresaNome: data.empresaNome.trim(),
        contatoNome: data.contatoNome?.trim() || null,
        email: data.email?.trim().toLowerCase() || null,
        telefone: data.telefone?.trim() || null,
        whatsapp: data.whatsapp?.trim() || null,
        origemLead: data.origemLead?.trim() || null,
        valorEstimado: data.valorEstimado ?? null,
        etapa: data.etapa ?? EtapaCrm.LEAD_RECEBIDO,
        probabilidade: data.probabilidade ?? this.defaultProbability(data.etapa ?? EtapaCrm.LEAD_RECEBIDO),
        previsaoFechamento: data.previsaoFechamento ? new Date(data.previsaoFechamento) : null,
        proximaAcao: data.proximaAcao?.trim() || null,
        dataProximaAcao: data.dataProximaAcao ? new Date(data.dataProximaAcao) : null,
        motivoPerda: data.motivoPerda?.trim() || null,
        observacoes: data.observacoes?.trim() || null,
      },
      include: this.include(),
    });
  }

  async update(empresaId: string, id: string, data: Partial<CreateOportunidadeDto>) {
    const atual = await this.prisma.oportunidadeCrm.findFirst({ where: { id, empresaId } });
    if (!atual) throw new BadRequestException('Oportunidade não encontrada.');

    await this.validateRelations(empresaId, data);

    return this.prisma.oportunidadeCrm.update({
      where: { id },
      data: {
        clienteId: data.clienteId !== undefined ? data.clienteId || null : undefined,
        produtoServicoId: data.produtoServicoId !== undefined ? data.produtoServicoId || null : undefined,
        responsavelId: data.responsavelId !== undefined ? data.responsavelId || null : undefined,
        titulo: data.titulo !== undefined ? data.titulo.trim() : undefined,
        empresaNome: data.empresaNome !== undefined ? data.empresaNome.trim() : undefined,
        contatoNome: data.contatoNome !== undefined ? data.contatoNome?.trim() || null : undefined,
        email: data.email !== undefined ? data.email?.trim().toLowerCase() || null : undefined,
        telefone: data.telefone !== undefined ? data.telefone?.trim() || null : undefined,
        whatsapp: data.whatsapp !== undefined ? data.whatsapp?.trim() || null : undefined,
        origemLead: data.origemLead !== undefined ? data.origemLead?.trim() || null : undefined,
        valorEstimado: data.valorEstimado !== undefined ? data.valorEstimado : undefined,
        etapa: data.etapa !== undefined ? data.etapa : undefined,
        probabilidade: data.probabilidade !== undefined ? data.probabilidade : undefined,
        previsaoFechamento: data.previsaoFechamento !== undefined ? (data.previsaoFechamento ? new Date(data.previsaoFechamento) : null) : undefined,
        proximaAcao: data.proximaAcao !== undefined ? data.proximaAcao?.trim() || null : undefined,
        dataProximaAcao: data.dataProximaAcao !== undefined ? (data.dataProximaAcao ? new Date(data.dataProximaAcao) : null) : undefined,
        motivoPerda: data.motivoPerda !== undefined ? data.motivoPerda?.trim() || null : undefined,
        observacoes: data.observacoes !== undefined ? data.observacoes?.trim() || null : undefined,
      },
      include: this.include(),
    });
  }


  async addComentario(user: AuthenticatedUser, id: string, mensagem: string) {
    const oportunidade = await this.prisma.oportunidadeCrm.findFirst({
      where: { id, empresaId: user.empresaId },
      include: { responsavel: true },
    });
    if (!oportunidade) throw new BadRequestException('Oportunidade não encontrada.');

    const comentario = await this.prisma.oportunidadeCrmComentario.create({
      data: {
        empresaId: user.empresaId,
        oportunidadeId: oportunidade.id,
        autorUsuarioId: user.id,
        autorNome: user.nome,
        mensagem: mensagem.trim(),
      },
      include: {
        autorUsuario: { select: { id: true, nome: true, email: true } },
      },
    });

    const usuarioIds = [oportunidade.responsavelId].filter(Boolean) as string[];
    if (usuarioIds.length) {
      await this.notificacoesService.notificarUsuarios({
        empresaId: user.empresaId,
        usuarioIds,
        titulo: 'Novo comentário no lead',
        mensagem: `${user.nome} comentou em "${oportunidade.titulo}".`,
        link: '/crm',
      });
    }

    return comentario;
  }

  async remove(empresaId: string, id: string) {
    const item = await this.prisma.oportunidadeCrm.findFirst({ where: { id, empresaId } });
    if (!item) throw new BadRequestException('Oportunidade não encontrada.');
    await this.prisma.oportunidadeCrm.delete({ where: { id } });
    return { message: 'Oportunidade excluída com sucesso.' };
  }

  async converter(empresaId: string, id: string, dto: ConvertOportunidadeDto) {
    const oportunidade = await this.prisma.oportunidadeCrm.findFirst({ where: { id, empresaId }, include: this.include() });
    if (!oportunidade) throw new BadRequestException('Oportunidade não encontrada.');

    const hoje = new Date();
    const fimPrevisto = new Date();
    fimPrevisto.setDate(fimPrevisto.getDate() + 90);

    return this.prisma.$transaction(async (tx) => {
      let clienteId = oportunidade.clienteId;
      if (!clienteId) {
        const cliente = await tx.cliente.create({
          data: {
            empresaId,
            razaoSocial: oportunidade.empresaNome,
            contatoPrincipal: oportunidade.contatoNome || null,
            email: oportunidade.email || null,
            telefone: oportunidade.telefone || null,
            whatsapp: oportunidade.whatsapp || null,
            status: 'ATIVO',
          },
        });
        clienteId = cliente.id;
      }

      let contratoId: string | null = null;
      if (dto.criarContrato) {
        const contrato = await tx.contrato.create({
          data: {
            empresaId,
            clienteId,
            produtoServicoId: oportunidade.produtoServicoId ?? null,
            titulo: oportunidade.titulo,
            objeto: oportunidade.observacoes || oportunidade.proximaAcao || 'Contrato originado do CRM',
            valor: oportunidade.valorEstimado ?? null,
            dataInicio: hoje,
            status: StatusContrato.RASCUNHO,
            gerarProjetoAutomatico: false,
            gerarFinanceiroAutomatico: false,
          },
        });
        contratoId = contrato.id;
      }

      let projetoId: string | null = null;
      if (dto.criarProjeto) {
        const projeto = await tx.projeto.create({
          data: {
            empresaId,
            clienteId,
            contratoId,
            produtoServicoId: oportunidade.produtoServicoId ?? null,
            responsavelId: oportunidade.responsavelId ?? null,
            nome: oportunidade.titulo,
            descricao: oportunidade.observacoes || 'Projeto originado da conversão do CRM',
            dataInicio: hoje,
            dataFimPrevista: fimPrevisto,
            status: StatusProjeto.PLANEJADO,
            visivelCliente: false,
          },
        });
        projetoId = projeto.id;
      }

      const atualizada = await tx.oportunidadeCrm.update({
        where: { id: oportunidade.id },
        data: {
          clienteId,
          etapa: EtapaCrm.FECHADO_GANHO,
          probabilidade: 100,
        },
        include: this.include(),
      });

      return {
        message: 'Oportunidade convertida com sucesso.',
        oportunidade: atualizada,
        clienteId,
        contratoId,
        projetoId,
      };
    });
  }

  async listEtapas() {
    return Object.values(EtapaCrm);
  }

  private defaultProbability(etapa: EtapaCrm) {
    switch (etapa) {
      case EtapaCrm.LEAD_RECEBIDO: return 10;
      case EtapaCrm.CONTATO_INICIADO: return 20;
      case EtapaCrm.DIAGNOSTICO: return 40;
      case EtapaCrm.PROPOSTA_ENVIADA: return 60;
      case EtapaCrm.NEGOCIACAO: return 80;
      case EtapaCrm.FECHADO_GANHO: return 100;
      case EtapaCrm.FECHADO_PERDIDO: return 0;
      case EtapaCrm.POS_VENDA: return 100;
      default: return 10;
    }
  }

  private async validateRelations(empresaId: string, data: Partial<CreateOportunidadeDto>) {
    if (data.clienteId) {
      const cliente = await this.prisma.cliente.findFirst({ where: { id: data.clienteId, empresaId } });
      if (!cliente) throw new BadRequestException('Cliente não encontrado nesta empresa.');
    }
    if (data.produtoServicoId) {
      const produto = await this.prisma.produtoServico.findFirst({ where: { id: data.produtoServicoId, empresaId } });
      if (!produto) throw new BadRequestException('Produto/serviço não encontrado nesta empresa.');
    }
    if (data.responsavelId) {
      const usuario = await this.prisma.usuario.findFirst({ where: { id: data.responsavelId, empresaId, ativo: true, perfil: { in: [PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA] } } });
      if (!usuario) throw new BadRequestException('Responsável comercial não encontrado nesta empresa.');
    }
  }
}
