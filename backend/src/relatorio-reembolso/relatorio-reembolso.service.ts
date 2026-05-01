import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma, TipoContaGerencial } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AutentiqueService } from '../autentique/autentique.service';

const INCLUDE = Prisma.validator<Prisma.RelatorioReembolsoInclude>()({
  projeto: { select: { id: true, nome: true } },
  responsavel: { select: { id: true, nome: true } },
  itens: { orderBy: { createdAt: 'asc' as const } },
  clientes: {
    include: {
      cliente: {
        select: {
          id: true,
          razaoSocial: true,
          nomeFantasia: true,
          nomeFazenda: true,
          distanciaKm: true,
          precoKmReembolso: true,
        },
      },
    },
    orderBy: { id: 'asc' as const },
  },
});

type RelatorioFull = Prisma.RelatorioReembolsoGetPayload<{ include: typeof INCLUDE }>;

export interface ItemReembolsoDto {
  tipo: 'KM' | 'PEDAGIO' | 'ALIMENTACAO' | 'HOSPEDAGEM' | 'OUTRO';
  data?: string;
  descricao: string;
  km?: number;
  precoKm?: number;
  valor: number;
}

export interface RateioClienteDto {
  clienteId: string;
  percentual: number;
}

export interface CreateRelatorioDto {
  projetoId?: string;
  responsavelId?: string;
  titulo: string;
  dataInicio: string;
  dataFim: string;
  observacoes?: string;
  itens: ItemReembolsoDto[];
  clientes: RateioClienteDto[];
}

export interface GerarFinanceiroDto {
  vencimentoPagar?: string;
  vencimentoReceber?: string;
}

@Injectable()
export class RelatorioReembolsoService {
  private readonly logger = new Logger(RelatorioReembolsoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly autentiqueService: AutentiqueService,
  ) {}

  async findAll(empresaId: string) {
    return this.prisma.relatorioReembolso.findMany({
      where: { empresaId },
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(empresaId: string, id: string) {
    const r = await this.prisma.relatorioReembolso.findFirst({
      where: { id, empresaId },
      include: INCLUDE,
    });
    if (!r) throw new BadRequestException('Relatório não encontrado.');
    return r;
  }

  async create(empresaId: string, dto: CreateRelatorioDto) {
    this.validateRateio(dto.clientes);
    const valorTotal = this.calcularTotal(dto.itens);

    return this.prisma.relatorioReembolso.create({
      data: {
        empresaId,
        projetoId: dto.projetoId || null,
        responsavelId: dto.responsavelId || null,
        titulo: dto.titulo.trim(),
        dataInicio: new Date(dto.dataInicio),
        dataFim: new Date(dto.dataFim),
        observacoes: dto.observacoes?.trim() || null,
        valorTotal,
        itens: {
          create: dto.itens.map((i) => ({
            tipo: i.tipo,
            data: i.data ? new Date(i.data) : null,
            descricao: i.descricao.trim(),
            km: i.km ?? null,
            precoKm: i.precoKm ?? null,
            valor: i.valor,
          })),
        },
        clientes: dto.clientes.length > 0 ? {
          create: dto.clientes.map((c) => ({
            clienteId: c.clienteId,
            percentual: c.percentual,
            valor: this.round(valorTotal * c.percentual / 100),
          })),
        } : undefined,
      },
      include: INCLUDE,
    });
  }

  async update(empresaId: string, id: string, dto: Partial<CreateRelatorioDto>) {
    const atual = await this.findOne(empresaId, id);
    if (atual.status === 'FINANCEIRO_GERADO') {
      throw new BadRequestException('Não é possível editar um relatório com financeiro já gerado.');
    }
    if (dto.clientes) this.validateRateio(dto.clientes);

    const novoTotal = dto.itens !== undefined ? this.calcularTotal(dto.itens) : atual.valorTotal;

    return this.prisma.$transaction(async (tx) => {
      if (dto.itens !== undefined) {
        await tx.itemReembolso.deleteMany({ where: { relatorioId: id } });
      }
      if (dto.clientes !== undefined) {
        await tx.reembolsoCliente.deleteMany({ where: { relatorioId: id } });
      }

      return tx.relatorioReembolso.update({
        where: { id },
        data: {
          ...(dto.titulo !== undefined ? { titulo: dto.titulo.trim() } : {}),
          ...(dto.projetoId !== undefined ? { projetoId: dto.projetoId || null } : {}),
          ...(dto.responsavelId !== undefined ? { responsavelId: dto.responsavelId || null } : {}),
          ...(dto.dataInicio ? { dataInicio: new Date(dto.dataInicio) } : {}),
          ...(dto.dataFim ? { dataFim: new Date(dto.dataFim) } : {}),
          ...(dto.observacoes !== undefined ? { observacoes: dto.observacoes?.trim() || null } : {}),
          ...(dto.itens !== undefined ? { valorTotal: novoTotal } : {}),
          ...(dto.itens !== undefined ? {
            itens: {
              create: dto.itens.map((i) => ({
                tipo: i.tipo,
                data: i.data ? new Date(i.data) : null,
                descricao: i.descricao.trim(),
                km: i.km ?? null,
                precoKm: i.precoKm ?? null,
                valor: i.valor,
              })),
            },
          } : {}),
          ...(dto.clientes !== undefined ? {
            clientes: {
              create: dto.clientes.map((c) => ({
                clienteId: c.clienteId,
                percentual: c.percentual,
                valor: this.round(novoTotal * c.percentual / 100),
              })),
            },
          } : {}),
        },
        include: INCLUDE,
      });
    });
  }

  async remove(empresaId: string, id: string) {
    await this.findOne(empresaId, id);
    await this.prisma.relatorioReembolso.delete({ where: { id } });
    return { ok: true };
  }

  async gerarDocumento(empresaId: string, id: string) {
    const rel = await this.findOne(empresaId, id);
    const empresa = await this.prisma.empresa.findUnique({ where: { id: empresaId } });
    if (!empresa) throw new BadRequestException('Empresa não encontrada.');

    const usuario = rel.responsavelId
      ? await this.prisma.usuario.findUnique({ where: { id: rel.responsavelId } })
      : null;

    const pdfBuffer = await this.autentiqueService.gerarPdfReembolso({
      empresaNome: empresa.nomeFantasia || empresa.nome,
      empresaCnpj: empresa.cnpj,
      empresaInfoBancarias: (empresa as any).infBancarias ?? null,
      responsavelNome: usuario?.nome ?? '',
      titulo: rel.titulo,
      periodoInicio: rel.dataInicio,
      periodoFim: rel.dataFim,
      observacoes: rel.observacoes ?? '',
      itens: rel.itens.map((i) => ({
        tipo: i.tipo,
        data: i.data ?? null,
        descricao: i.descricao,
        km: i.km ?? null,
        precoKm: i.precoKm ?? null,
        valor: i.valor,
      })),
      clientes: rel.clientes.map((c) => ({
        nome: c.cliente.nomeFantasia || c.cliente.razaoSocial,
        percentual: c.percentual,
        valor: c.valor,
      })),
      valorTotal: rel.valorTotal,
    });

    const slug = rel.titulo.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
    const nomeArquivo = `reembolso-${slug}-${new Date().toISOString().slice(0, 10)}.pdf`;
    const url = await this.storageService.uploadFile(pdfBuffer, nomeArquivo, 'application/pdf', 'relatorios');

    await this.prisma.relatorioReembolso.update({
      where: { id },
      data: { documentoUrl: url },
    });

    this.logger.log(`PDF reembolso gerado: ${id} — ${url}`);
    return { documentoUrl: url };
  }

  async enviarParaAprovacao(empresaId: string, id: string, signatarioNome: string, signatarioEmail: string) {
    const rel = await this.findOne(empresaId, id);
    if (!rel.documentoUrl) throw new BadRequestException('Gere o PDF antes de enviar para aprovação.');
    if (rel.autentiqueDocId) throw new BadRequestException('Documento já foi enviado para aprovação.');

    const resp = await fetch(rel.documentoUrl);
    if (!resp.ok) throw new BadRequestException('Não foi possível baixar o PDF.');
    const pdfBuffer = Buffer.from(await resp.arrayBuffer());

    const { docId, signUrl } = await this.autentiqueService.enviarDocumento({
      nome: rel.titulo,
      pdfBuffer,
      signatarioNome,
      signatarioEmail,
    });

    await this.prisma.relatorioReembolso.update({
      where: { id },
      data: { autentiqueDocId: docId, status: 'AGUARDANDO_APROVACAO' },
    });

    return { docId, signUrl };
  }

  async sincronizarAprovacao(empresaId: string, id: string) {
    const rel = await this.findOne(empresaId, id);
    if (!rel.autentiqueDocId) throw new BadRequestException('Relatório não foi enviado ao Autentique.');

    const autDoc = await this.autentiqueService.consultarDocumento(rel.autentiqueDocId);
    if (!autDoc) throw new BadRequestException('Documento não encontrado no Autentique.');

    const aprovado = autDoc.signatures.every((s) => !!s.signed);

    if (aprovado && rel.status !== 'APROVADO') {
      await this.prisma.relatorioReembolso.update({
        where: { id },
        data: {
          status: 'APROVADO',
          documentoUrl: autDoc.files.signed ?? rel.documentoUrl,
        },
      });
    }

    return { aprovado, signatures: autDoc.signatures, signedUrl: autDoc.files.signed };
  }

  async gerarFinanceiro(empresaId: string, id: string, dto: GerarFinanceiroDto) {
    const rel = await this.findOne(empresaId, id);
    if (rel.status === 'FINANCEIRO_GERADO') {
      throw new BadRequestException('Financeiro já foi gerado para este relatório.');
    }
    if (rel.clientes.length === 0) {
      throw new BadRequestException('Adicione ao menos um cliente antes de gerar o financeiro.');
    }

    const contaReembolsos = await this.ensureContaReembolsos(empresaId);
    const contaDespesas = await this.ensureContaDespesasViagem(empresaId);

    const addDays = (days: number) => {
      const d = new Date(); d.setDate(d.getDate() + days); return d;
    };
    const vencPagar = dto.vencimentoPagar ? new Date(dto.vencimentoPagar) : addDays(30);
    const vencReceber = dto.vencimentoReceber ? new Date(dto.vencimentoReceber) : addDays(30);

    return this.prisma.$transaction(async (tx) => {
      const contaPagar = await tx.contaPagar.create({
        data: {
          empresaId,
          contaGerencialId: contaDespesas.id,
          fornecedor: rel.responsavel?.nome ?? 'Responsável',
          descricao: `Reembolso de deslocamento — ${rel.titulo}`,
          competencia: rel.dataInicio,
          vencimento: vencPagar,
          valor: rel.valorTotal,
          observacoes: rel.observacoes ?? undefined,
          status: 'ABERTO',
        },
      });

      for (const rc of rel.clientes) {
        const valorCliente = this.round(rel.valorTotal * rc.percentual / 100);
        const recebivel = await tx.recebivel.create({
          data: {
            empresaId,
            clienteId: rc.clienteId,
            contaGerencialId: contaReembolsos.id,
            descricao: `Reembolso de deslocamento — ${rel.titulo}`,
            valor: valorCliente,
            vencimento: vencReceber,
            status: 'ABERTO',
            origemAutomatica: true,
          },
        });
        await tx.reembolsoCliente.update({
          where: { id: rc.id },
          data: { recebivelId: recebivel.id, valor: valorCliente },
        });
      }

      await tx.relatorioReembolso.update({
        where: { id },
        data: { status: 'FINANCEIRO_GERADO' },
      });

      this.logger.log(`Financeiro gerado para relatório ${id} — ContaPagar: ${contaPagar.id}`);
      return { message: 'Financeiro gerado com sucesso.', contaPagarId: contaPagar.id, valorTotal: rel.valorTotal };
    });
  }

  private round(n: number) {
    return Math.round(n * 100) / 100;
  }

  private calcularTotal(itens: ItemReembolsoDto[]) {
    return this.round(itens.reduce((s, i) => s + i.valor, 0));
  }

  private validateRateio(clientes: RateioClienteDto[]) {
    if (clientes.length === 0) return;
    const total = clientes.reduce((s, c) => s + c.percentual, 0);
    if (Math.abs(total - 100) > 0.01) {
      throw new BadRequestException(`O rateio deve somar 100% (atual: ${total.toFixed(1)}%).`);
    }
  }

  private async ensureContaReembolsos(empresaId: string) {
    const tipo = TipoContaGerencial.RECEITA;
    let naoOp = await this.prisma.contaGerencial.findFirst({ where: { empresaId, descricao: 'Receitas Não Operacionais', tipo } });
    if (!naoOp) {
      const last = await this.prisma.contaGerencial.findFirst({ where: { empresaId, contaPaiId: null, tipo }, orderBy: { codigo: 'desc' } });
      naoOp = await this.prisma.contaGerencial.create({ data: { empresaId, codigo: last ? String(parseInt(last.codigo) + 1) : '9', descricao: 'Receitas Não Operacionais', tipo, aceitaLancamento: false } });
    }
    let sub = await this.prisma.contaGerencial.findFirst({ where: { empresaId, contaPaiId: naoOp.id, descricao: 'Reembolsos' } });
    if (!sub) {
      const last = await this.prisma.contaGerencial.findFirst({ where: { empresaId, contaPaiId: naoOp.id }, orderBy: { codigo: 'desc' } });
      const next = last ? `${naoOp.codigo}.${parseInt(last.codigo.split('.').pop()!) + 1}` : `${naoOp.codigo}.1`;
      sub = await this.prisma.contaGerencial.create({ data: { empresaId, codigo: next, contaPaiId: naoOp.id, descricao: 'Reembolsos', tipo, aceitaLancamento: true } });
    }
    return sub;
  }

  private async ensureContaDespesasViagem(empresaId: string) {
    const tipo = TipoContaGerencial.DESPESA;
    let despesas = await this.prisma.contaGerencial.findFirst({ where: { empresaId, descricao: 'Despesas Operacionais', tipo } });
    if (!despesas) {
      const last = await this.prisma.contaGerencial.findFirst({ where: { empresaId, contaPaiId: null, tipo }, orderBy: { codigo: 'desc' } });
      despesas = await this.prisma.contaGerencial.create({ data: { empresaId, codigo: last ? String(parseInt(last.codigo) + 1) : '5', descricao: 'Despesas Operacionais', tipo, aceitaLancamento: false } });
    }
    let viagens = await this.prisma.contaGerencial.findFirst({ where: { empresaId, contaPaiId: despesas.id, descricao: 'Viagens e Deslocamentos' } });
    if (!viagens) {
      const last = await this.prisma.contaGerencial.findFirst({ where: { empresaId, contaPaiId: despesas.id }, orderBy: { codigo: 'desc' } });
      const next = last ? `${despesas.codigo}.${parseInt(last.codigo.split('.').pop()!) + 1}` : `${despesas.codigo}.1`;
      viagens = await this.prisma.contaGerencial.create({ data: { empresaId, codigo: next, contaPaiId: despesas.id, descricao: 'Viagens e Deslocamentos', tipo, aceitaLancamento: true } });
    }
    return viagens;
  }
}
