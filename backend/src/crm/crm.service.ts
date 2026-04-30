import { BadRequestException, Injectable } from '@nestjs/common';
import { EtapaCrm, PerfilUsuario, Prisma, StatusContrato, StatusProjeto } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { CreateOportunidadeDto } from './dto/create-oportunidade.dto';
import { ConvertOportunidadeDto } from './dto/convert-oportunidade.dto';
import { CreateEtapaDto, UpdateEtapaDto } from './dto/create-etapa.dto';

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

  private readonly defaultEtapas = [
    { chave: 'LEAD_RECEBIDO',    nome: 'Lead Recebido',    cor: '#6b7280', ordem: 0 },
    { chave: 'CONTATO_INICIADO', nome: 'Contato Iniciado', cor: '#3b82f6', ordem: 1 },
    { chave: 'DIAGNOSTICO',      nome: 'Diagnóstico',      cor: '#8b5cf6', ordem: 2 },
    { chave: 'PROPOSTA_ENVIADA', nome: 'Proposta Enviada', cor: '#f59e0b', ordem: 3 },
    { chave: 'NEGOCIACAO',       nome: 'Negociação',       cor: '#f97316', ordem: 4 },
    { chave: 'FECHADO_GANHO',    nome: 'Fechado Ganho',    cor: '#10b981', ordem: 5 },
    { chave: 'FECHADO_PERDIDO',  nome: 'Fechado Perdido',  cor: '#ef4444', ordem: 6 },
    { chave: 'POS_VENDA',        nome: 'Pós-venda',        cor: '#14b8a6', ordem: 7 },
  ];

  async listEtapas(empresaId: string) {
    let etapas = await this.prisma.crmEtapa.findMany({
      where: { empresaId },
      orderBy: { ordem: 'asc' },
    });
    if (etapas.length === 0) {
      await this.prisma.crmEtapa.createMany({
        data: this.defaultEtapas.map((e) => ({ ...e, empresaId })),
      });
      etapas = await this.prisma.crmEtapa.findMany({
        where: { empresaId },
        orderBy: { ordem: 'asc' },
      });
    }
    return etapas;
  }

  async createEtapa(empresaId: string, dto: CreateEtapaDto) {
    const chave = dto.chave.trim().toUpperCase().replace(/\s+/g, '_');
    const existing = await this.prisma.crmEtapa.findUnique({ where: { empresaId_chave: { empresaId, chave } } });
    if (existing) throw new BadRequestException('Já existe uma etapa com essa chave.');
    const maxOrdem = await this.prisma.crmEtapa.aggregate({ where: { empresaId }, _max: { ordem: true } });
    return this.prisma.crmEtapa.create({
      data: { empresaId, chave, nome: dto.nome.trim(), cor: dto.cor ?? '#6366f1', ordem: dto.ordem ?? (maxOrdem._max.ordem ?? -1) + 1 },
    });
  }

  async updateEtapa(empresaId: string, id: string, dto: UpdateEtapaDto) {
    const etapa = await this.prisma.crmEtapa.findFirst({ where: { id, empresaId } });
    if (!etapa) throw new BadRequestException('Etapa não encontrada.');
    return this.prisma.crmEtapa.update({
      where: { id },
      data: {
        ...(dto.nome ? { nome: dto.nome.trim() } : {}),
        ...(dto.cor !== undefined ? { cor: dto.cor } : {}),
        ...(dto.ordem !== undefined ? { ordem: dto.ordem } : {}),
      },
    });
  }

  async removeEtapa(empresaId: string, id: string) {
    const etapa = await this.prisma.crmEtapa.findFirst({ where: { id, empresaId } });
    if (!etapa) throw new BadRequestException('Etapa não encontrada.');
    await this.prisma.crmEtapa.delete({ where: { id } });
    return { message: 'Etapa excluída.' };
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
        etapa: (data.etapa as EtapaCrm) ?? EtapaCrm.LEAD_RECEBIDO,
        probabilidade: data.probabilidade ?? this.defaultProbability(data.etapa ?? 'LEAD_RECEBIDO'),
        previsaoFechamento: data.previsaoFechamento ? new Date(data.previsaoFechamento) : null,
        proximaAcao: data.proximaAcao?.trim() || null,
        dataProximaAcao: data.dataProximaAcao ? new Date(data.dataProximaAcao) : null,
        motivoPerda: data.motivoPerda?.trim() || null,
        observacoes: data.observacoes?.trim() || null,
        tags: data.tags ?? [],
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
        etapa: data.etapa !== undefined ? (data.etapa as EtapaCrm) : undefined,
        probabilidade: data.probabilidade !== undefined ? data.probabilidade : undefined,
        previsaoFechamento: data.previsaoFechamento !== undefined ? (data.previsaoFechamento ? new Date(data.previsaoFechamento) : null) : undefined,
        proximaAcao: data.proximaAcao !== undefined ? data.proximaAcao?.trim() || null : undefined,
        dataProximaAcao: data.dataProximaAcao !== undefined ? (data.dataProximaAcao ? new Date(data.dataProximaAcao) : null) : undefined,
        motivoPerda: data.motivoPerda !== undefined ? data.motivoPerda?.trim() || null : undefined,
        observacoes: data.observacoes !== undefined ? data.observacoes?.trim() || null : undefined,
        tags: data.tags !== undefined ? data.tags : undefined,
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

  private defaultProbability(etapa: string) {
    const map: Record<string, number> = {
      LEAD_RECEBIDO: 10, CONTATO_INICIADO: 20, DIAGNOSTICO: 40,
      PROPOSTA_ENVIADA: 60, NEGOCIACAO: 80, FECHADO_GANHO: 100,
      FECHADO_PERDIDO: 0, POS_VENDA: 100,
    };
    return map[etapa] ?? 10;
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
