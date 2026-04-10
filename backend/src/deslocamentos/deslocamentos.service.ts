import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { StatusDocumento, TipoDocumento, TipoContaGerencial } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AutentiqueService } from '../autentique/autentique.service';

export interface CreateDeslocamentoDto {
  projetoId: string;
  clienteId: string;
  responsavelId?: string;
  data: string; // ISO date
  distanciaKm: number;
  precoKm: number;
  descricao?: string;
  observacoes?: string;
  docFiscal?: string;
  pedagios?: number;
  refeicao?: number;
}

export interface GerarRelatorioDto {
  projetoId: string;
  dataInicio: string;
  dataFim: string;
  adiantamento?: number;
  anotacoes?: string;
  vencimento?: string; // ISO date para o contas a receber
}

@Injectable()
export class DeslocamentosService {
  private readonly logger = new Logger(DeslocamentosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly autentiqueService: AutentiqueService,
  ) {}

  async findAll(empresaId: string, projetoId?: string) {
    return this.prisma.deslocamento.findMany({
      where: { empresaId, ...(projetoId ? { projetoId } : {}) },
      include: {
        projeto: { select: { id: true, nome: true } },
        cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true, nomeFazenda: true } },
        responsavel: { select: { id: true, nome: true } },
      },
      orderBy: { data: 'desc' },
    });
  }

  async findOne(empresaId: string, id: string) {
    const d = await this.prisma.deslocamento.findFirst({
      where: { id, empresaId },
      include: {
        projeto: { select: { id: true, nome: true } },
        cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true, nomeFazenda: true } },
        responsavel: { select: { id: true, nome: true } },
      },
    });
    if (!d) throw new BadRequestException('Deslocamento não encontrado.');
    return d;
  }

  async create(empresaId: string, data: CreateDeslocamentoDto) {
    const projeto = await this.prisma.projeto.findFirst({ where: { id: data.projetoId, empresaId } });
    if (!projeto) throw new BadRequestException('Projeto não encontrado.');

    const valorTotal = Math.round(data.distanciaKm * data.precoKm * 100) / 100;

    return this.prisma.deslocamento.create({
      data: {
        empresaId,
        projetoId: data.projetoId,
        clienteId: data.clienteId,
        responsavelId: data.responsavelId ?? null,
        data: new Date(data.data),
        distanciaKm: data.distanciaKm,
        precoKm: data.precoKm,
        valorTotal,
        descricao: data.descricao ?? null,
        observacoes: data.observacoes ?? null,
        docFiscal: data.docFiscal ?? null,
        pedagios: data.pedagios ?? null,
        refeicao: data.refeicao ?? null,
      },
      include: {
        projeto: { select: { id: true, nome: true } },
        cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true, nomeFazenda: true } },
        responsavel: { select: { id: true, nome: true } },
      },
    });
  }

  async update(empresaId: string, id: string, data: Partial<CreateDeslocamentoDto> & { reembolsado?: boolean }) {
    await this.findOne(empresaId, id);

    const distancia = data.distanciaKm;
    const preco = data.precoKm;

    return this.prisma.deslocamento.update({
      where: { id },
      data: {
        ...(data.data !== undefined ? { data: new Date(data.data) } : {}),
        ...(distancia !== undefined ? { distanciaKm: distancia } : {}),
        ...(preco !== undefined ? { precoKm: preco } : {}),
        ...(distancia !== undefined && preco !== undefined ? { valorTotal: Math.round(distancia * preco * 100) / 100 } : {}),
        ...(data.descricao !== undefined ? { descricao: data.descricao } : {}),
        ...(data.observacoes !== undefined ? { observacoes: data.observacoes } : {}),
        ...(data.docFiscal !== undefined ? { docFiscal: data.docFiscal || null } : {}),
        ...(data.pedagios !== undefined ? { pedagios: data.pedagios } : {}),
        ...(data.refeicao !== undefined ? { refeicao: data.refeicao } : {}),
        ...(data.reembolsado !== undefined ? { reembolsado: data.reembolsado } : {}),
        ...(data.responsavelId !== undefined ? { responsavelId: data.responsavelId || null } : {}),
      },
      include: {
        projeto: { select: { id: true, nome: true } },
        cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true, nomeFazenda: true } },
        responsavel: { select: { id: true, nome: true } },
      },
    });
  }

  async remove(empresaId: string, id: string) {
    await this.findOne(empresaId, id);
    await this.prisma.deslocamento.delete({ where: { id } });
    return { ok: true };
  }

  async totalPorProjeto(empresaId: string, projetoId: string) {
    const agg = await this.prisma.deslocamento.aggregate({
      where: { empresaId, projetoId },
      _sum: { valorTotal: true, distanciaKm: true },
      _count: true,
    });
    return {
      count: agg._count,
      totalKm: agg._sum.distanciaKm ?? 0,
      totalValor: agg._sum.valorTotal ?? 0,
    };
  }

  // ─── RELATÓRIO ────────────────────────────────────────────────────────────

  async gerarRelatorio(empresaId: string, userId: string, dto: GerarRelatorioDto) {
    const empresa = await this.prisma.empresa.findUnique({ where: { id: empresaId } });
    if (!empresa) throw new BadRequestException('Empresa não encontrada.');

    const projeto = await this.prisma.projeto.findFirst({
      where: { id: dto.projetoId, empresaId },
      include: {
        cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true } },
      },
    });
    if (!projeto) throw new BadRequestException('Projeto não encontrado.');

    const usuario = await this.prisma.usuario.findUnique({ where: { id: userId } });

    const deslocamentos = await this.prisma.deslocamento.findMany({
      where: {
        empresaId,
        projetoId: dto.projetoId,
        data: {
          gte: new Date(dto.dataInicio),
          lte: new Date(dto.dataFim),
        },
      },
      orderBy: { data: 'asc' },
    });

    if (deslocamentos.length === 0) {
      throw new BadRequestException('Nenhum deslocamento encontrado para o período informado.');
    }

    const clienteNome = projeto.cliente?.nomeFantasia || projeto.cliente?.razaoSocial || 'Cliente';
    const adiantamento = dto.adiantamento ?? 0;
    const anotacoes = dto.anotacoes ?? '';

    const pdfBuffer = await this.autentiqueService.gerarPdfRelatorioDeslocamento({
      empresaNome: empresa.nomeFantasia || empresa.nome,
      empresaCnpj: empresa.cnpj,
      empresaInfoBancarias: (empresa as any).infBancarias,
      clienteNome,
      responsavelNome: usuario?.nome ?? '',
      periodoInicio: new Date(dto.dataInicio),
      periodoFim: new Date(dto.dataFim),
      deslocamentos: deslocamentos.map((d) => ({
        data: d.data,
        docFiscal: (d as any).docFiscal,
        descricao: d.descricao,
        distanciaKm: d.distanciaKm,
        precoKm: d.precoKm,
        valorTotal: d.valorTotal,
        pedagios: (d as any).pedagios,
        refeicao: (d as any).refeicao,
      })),
      adiantamento,
      anotacoes,
    });

    const nomeArquivo = `relatorio-deslocamento-${projeto.nome.toLowerCase().replace(/\s+/g, '-')}-${dto.dataInicio.slice(0, 7)}.pdf`;
    const url = await this.storageService.uploadFile(pdfBuffer, nomeArquivo, 'application/pdf', 'relatorios');

    const totalKm = deslocamentos.reduce((s, d) => s + d.distanciaKm, 0);
    const totalValor = deslocamentos.reduce((s, d) => {
      return s + d.valorTotal + ((d as any).pedagios ?? 0) + ((d as any).refeicao ?? 0);
    }, 0) - adiantamento;

    const nomePeriodo = `${new Date(dto.dataInicio).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric', timeZone: 'UTC' })} a ${new Date(dto.dataFim).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric', timeZone: 'UTC' })}`;

    const documento = await this.prisma.documento.create({
      data: {
        empresaId,
        projetoId: dto.projetoId,
        nome: `Relatório de Deslocamento — ${projeto.nome} — ${nomePeriodo}`,
        tipo: TipoDocumento.RELATORIO_DESLOCAMENTO,
        descricao: `${deslocamentos.length} deslocamento(s) • ${totalKm} km • Total: R$ ${totalValor.toFixed(2)}`,
        arquivoUrl: url,
        arquivoNomeOriginal: nomeArquivo,
        arquivoMimeType: 'application/pdf',
        arquivoTamanho: pdfBuffer.length,
        status: StatusDocumento.RASCUNHO,
        exigeAssinatura: true,
        visivelCliente: false,
      },
    });

    this.logger.log(`Relatório gerado: ${documento.id} — ${url}`);
    return documento;
  }

  async enviarParaAssinatura(empresaId: string, documentoId: string, signatarioNome: string, signatarioEmail: string) {
    const documento = await this.prisma.documento.findFirst({ where: { id: documentoId, empresaId } });
    if (!documento) throw new BadRequestException('Documento não encontrado.');
    if (!documento.arquivoUrl) throw new BadRequestException('Documento não possui arquivo gerado.');
    if ((documento as any).autentiqueDocId) throw new BadRequestException('Documento já foi enviado para assinatura.');

    // Baixa o PDF do R2 para reenviar ao Autentique
    const pdfResponse = await fetch(documento.arquivoUrl);
    if (!pdfResponse.ok) throw new BadRequestException('Não foi possível baixar o PDF para envio.');
    const pdfArrayBuffer = await pdfResponse.arrayBuffer();
    const pdfBuffer = Buffer.from(pdfArrayBuffer);

    const { docId, signUrl } = await this.autentiqueService.enviarDocumento({
      nome: documento.nome,
      pdfBuffer,
      signatarioNome,
      signatarioEmail,
    });

    await this.prisma.documento.update({
      where: { id: documentoId },
      data: {
        autentiqueDocId: docId,
        status: StatusDocumento.AGUARDANDO_ASSINATURA,
        dataEnvio: new Date(),
        observacaoInterna: signUrl,
      } as any,
    });

    return { docId, signUrl };
  }

  async sincronizarAssinatura(empresaId: string, documentoId: string) {
    const documento = await this.prisma.documento.findFirst({ where: { id: documentoId, empresaId } });
    if (!documento) throw new BadRequestException('Documento não encontrado.');

    const autentiqueDocId = (documento as any).autentiqueDocId as string | null;
    if (!autentiqueDocId) throw new BadRequestException('Documento não foi enviado ao Autentique.');

    const autDoc = await this.autentiqueService.consultarDocumento(autentiqueDocId);
    if (!autDoc) throw new BadRequestException('Documento não encontrado no Autentique.');

    const assinado = autDoc.signatures.every((s) => !!s.signed);

    if (assinado && documento.status !== StatusDocumento.ASSINADO) {
      const urlAssinado = autDoc.files.signed ?? documento.arquivoUrl;

      await this.prisma.documento.update({
        where: { id: documentoId },
        data: {
          status: StatusDocumento.ASSINADO,
          arquivoUrl: urlAssinado,
          dataConclusao: new Date(),
        } as any,
      });

      await this.criarContaReceber(empresaId, documentoId, documento);
    }

    return {
      assinado,
      signatures: autDoc.signatures,
      signedUrl: autDoc.files.signed,
    };
  }

  private async criarContaReceber(empresaId: string, documentoId: string, documento: { projetoId?: string | null; nome: string; descricao?: string | null }) {
    try {
      const contaReembolsos = await this.ensureContaReembolsos(empresaId);

      // Extrai valor total da descrição (ex: "Total: R$ 3.147,20")
      const matchValor = documento.descricao?.match(/Total: R\$\s*([\d.,]+)/);
      const valor = matchValor ? parseFloat(matchValor[1].replace(/\./g, '').replace(',', '.')) : 0;
      if (valor <= 0) return;

      // Busca clienteId via projeto
      let clienteId: string | undefined;
      if (documento.projetoId) {
        const projeto = await this.prisma.projeto.findUnique({ where: { id: documento.projetoId } });
        clienteId = projeto?.clienteId ?? undefined;
      }
      if (!clienteId) return;

      const vencimento = new Date();
      vencimento.setDate(vencimento.getDate() + 30);

      await this.prisma.recebivel.create({
        data: {
          empresaId,
          clienteId,
          contaGerencialId: contaReembolsos.id,
          descricao: documento.nome,
          valor,
          vencimento,
          status: 'ABERTO',
          origemAutomatica: true,
        },
      });

      this.logger.log(`ContaReceber criada automaticamente para documento ${documentoId} — R$ ${valor}`);
    } catch (err) {
      this.logger.error(`Falha ao criar ContaReceber para documento ${documentoId}:`, err);
    }
  }

  private async ensureContaReembolsos(empresaId: string) {
    // Busca ou cria hierarquia: Receitas Não Operacionais > Receitas Financeiras > Reembolsos
    const tipo = TipoContaGerencial.RECEITA;

    let naoOp = await this.prisma.contaGerencial.findFirst({
      where: { empresaId, descricao: 'Receitas Não Operacionais', tipo },
    });
    if (!naoOp) {
      const lastCodigo = await this.prisma.contaGerencial.findFirst({
        where: { empresaId, contaPaiId: null, tipo },
        orderBy: { codigo: 'desc' },
      });
      const nextCodigo = lastCodigo ? String(parseInt(lastCodigo.codigo) + 1) : '9';
      naoOp = await this.prisma.contaGerencial.create({
        data: { empresaId, codigo: nextCodigo, descricao: 'Receitas Não Operacionais', tipo, aceitaLancamento: false },
      });
    }

    let recFin = await this.prisma.contaGerencial.findFirst({
      where: { empresaId, contaPaiId: naoOp.id, descricao: 'Receitas Financeiras' },
    });
    if (!recFin) {
      const lastSub = await this.prisma.contaGerencial.findFirst({
        where: { empresaId, contaPaiId: naoOp.id },
        orderBy: { codigo: 'desc' },
      });
      const nextCodigo = lastSub ? `${naoOp.codigo}.${parseInt(lastSub.codigo.split('.').pop()!) + 1}` : `${naoOp.codigo}.1`;
      recFin = await this.prisma.contaGerencial.create({
        data: { empresaId, codigo: nextCodigo, contaPaiId: naoOp.id, descricao: 'Receitas Financeiras', tipo, aceitaLancamento: false },
      });
    }

    let reembolsos = await this.prisma.contaGerencial.findFirst({
      where: { empresaId, contaPaiId: recFin.id, descricao: 'Reembolsos' },
    });
    if (!reembolsos) {
      const lastSub = await this.prisma.contaGerencial.findFirst({
        where: { empresaId, contaPaiId: recFin.id },
        orderBy: { codigo: 'desc' },
      });
      const nextCodigo = lastSub ? `${recFin.codigo}.${parseInt(lastSub.codigo.split('.').pop()!) + 1}` : `${recFin.codigo}.1`;
      reembolsos = await this.prisma.contaGerencial.create({
        data: { empresaId, codigo: nextCodigo, contaPaiId: recFin.id, descricao: 'Reembolsos', tipo, aceitaLancamento: true },
      });
    }

    return reembolsos;
  }
}
