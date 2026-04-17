import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { StatusFaturamento, StatusRecebivel } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EnotasService } from './enotas.service';

function primeiroDiaUtilDoMes(ano: number, mes: number): Date {
  // mes: 0-indexed (Jan=0)
  let dia = new Date(ano, mes, 1);
  // Pula final de semana (0=Dom, 6=Sab)
  while (dia.getDay() === 0 || dia.getDay() === 6) {
    dia = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate() + 1);
  }
  return dia;
}

function competenciaAtual(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
}

@Injectable()
export class FaturamentoService {
  private readonly logger = new Logger(FaturamentoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly enotas: EnotasService,
  ) {}

  // ─── Listar itens faturáveis do mês ────────────────────────────────────────

  async listarFaturaveisMes(empresaId: string, competencia?: string) {
    const comp = competencia || competenciaAtual();
    const [ano, mes] = comp.split('-').map(Number);

    const inicioMes = new Date(ano, mes - 1, 1);
    const fimMes = new Date(ano, mes, 0, 23, 59, 59);

    // Parcelas do mês que ainda não foram faturadas
    const cobrancas = await this.prisma.contratoCobranca.findMany({
      where: {
        empresaId,
        vencimento: { gte: inicioMes, lte: fimMes },
        faturamento: null, // ainda não faturada
        contrato: {
          status: { in: ['ATIVO', 'AGUARDANDO_CONFERENCIA'] as any },
        },
      },
      include: {
        contrato: {
          select: {
            id: true,
            titulo: true,
            clienteId: true,
            clienteRazaoSocial: true,
            clienteNomeFantasia: true,
            contatoClienteEmail: true,
            objeto: true,
            produtoServicoId: true,
          },
        },
      },
      orderBy: [{ vencimento: 'asc' }],
    });

    return { competencia: comp, itens: cobrancas };
  }

  // ─── Listar faturamentos existentes ────────────────────────────────────────

  async listarFaturamentos(empresaId: string, competencia?: string) {
    const where: any = { empresaId };
    if (competencia) where.competencia = competencia;

    return this.prisma.faturamento.findMany({
      where,
      include: {
        cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true, email: true } },
        contrato: { select: { id: true, titulo: true } },
        contratoCobranca: { select: { id: true, ordem: true, vencimento: true } },
      },
      orderBy: [{ competencia: 'desc' }, { dataVencimento: 'asc' }],
    });
  }

  // ─── Faturamento avulso (sem contrato) ────────────────────────────────────

  async faturarAvulso(empresaId: string, data: {
    clienteId: string;
    descricao: string;
    valor: number;
    vencimento: string;
    competencia?: string;
    observacoes?: string;
  }): Promise<any> {
    const cliente = await this.prisma.cliente.findFirst({ where: { id: data.clienteId, empresaId } });
    if (!cliente) throw new BadRequestException('Cliente não encontrado.');

    const venc = new Date(data.vencimento);
    const comp = data.competencia
      || `${venc.getFullYear()}-${String(venc.getMonth() + 1).padStart(2, '0')}`;

    const faturamento = await this.prisma.faturamento.create({
      data: {
        empresaId,
        clienteId: data.clienteId,
        competencia: comp,
        dataVencimento: venc,
        valor: data.valor,
        descricao: data.descricao,
        observacoes: data.observacoes || null,
        status: StatusFaturamento.PENDENTE,
      },
    });

    if (this.enotas.configurado) {
      await this.emitirNfse(faturamento.id, empresaId);
    }

    return this.prisma.faturamento.findUnique({
      where: { id: faturamento.id },
      include: {
        cliente: { select: { id: true, razaoSocial: true, email: true } },
      },
    });
  }

  // ─── Faturar uma parcela ────────────────────────────────────────────────────

  async faturarCobranca(empresaId: string, contratoCobrancaId: string): Promise<any> {
    const cobranca = await this.prisma.contratoCobranca.findFirst({
      where: { id: contratoCobrancaId, empresaId },
      include: {
        contrato: true,
        faturamento: true,
      },
    });

    if (!cobranca) throw new BadRequestException('Parcela não encontrada.');
    if (cobranca.faturamento) throw new BadRequestException('Esta parcela já foi faturada.');

    const empresa = await this.prisma.empresa.findFirst({ where: { id: empresaId } });
    if (!empresa) throw new BadRequestException('Empresa não encontrada.');

    const comp = `${cobranca.vencimento.getFullYear()}-${String(cobranca.vencimento.getMonth() + 1).padStart(2, '0')}`;

    // Cria o registro de faturamento
    const faturamento = await this.prisma.faturamento.create({
      data: {
        empresaId,
        clienteId: cobranca.contrato.clienteId,
        contratoId: cobranca.contratoId,
        contratoCobrancaId: cobranca.id,
        competencia: comp,
        dataVencimento: cobranca.vencimento,
        valor: cobranca.valor,
        descricao: cobranca.descricao || `${cobranca.contrato.titulo} — Parcela ${cobranca.ordem}`,
        status: StatusFaturamento.PENDENTE,
      },
    });

    // Emite NFS-e se eNotas configurado
    if (this.enotas.configurado) {
      await this.emitirNfse(faturamento.id, empresaId);
    }

    return this.prisma.faturamento.findUnique({
      where: { id: faturamento.id },
      include: {
        cliente: { select: { id: true, razaoSocial: true, email: true } },
        contrato: { select: { id: true, titulo: true } },
      },
    });
  }

  // ─── Faturar todos do mês ──────────────────────────────────────────────────

  async faturarTodosMes(empresaId: string, competencia?: string) {
    const { itens } = await this.listarFaturaveisMes(empresaId, competencia);

    const resultados = await Promise.allSettled(
      itens.map((c) => this.faturarCobranca(empresaId, c.id)),
    );

    const sucesso = resultados.filter((r) => r.status === 'fulfilled').length;
    const falha = resultados.filter((r) => r.status === 'rejected').length;

    this.logger.log(`Faturamento em lote: ${sucesso} ok, ${falha} falhas`);
    return { total: itens.length, sucesso, falha };
  }

  // ─── Emitir NFS-e para faturamento já criado ──────────────────────────────

  async emitirNfse(faturamentoId: string, empresaId: string) {
    const fat = await this.prisma.faturamento.findFirst({
      where: { id: faturamentoId, empresaId },
      include: {
        cliente: true,
        empresa: true,
      },
    });

    if (!fat) throw new BadRequestException('Faturamento não encontrado.');
    if (fat.status === StatusFaturamento.EMITIDO) throw new BadRequestException('NFS-e já emitida.');

    await this.prisma.faturamento.update({
      where: { id: faturamentoId },
      data: { status: StatusFaturamento.EMITINDO, erroEmissao: null },
    });

    try {
      const nfse = await this.enotas.emitirNfse({
        idExterno: faturamentoId,
        dataCompetencia: fat.dataVencimento.toISOString(),
        cliente: {
          nome: fat.cliente.razaoSocial,
          email: fat.cliente.email || undefined,
          cpfCnpj: fat.cliente.cpfCnpj || undefined,
          inscricaoEstadual: fat.cliente.inscricaoEstadual || undefined,
          endereco: {
            pais: 'Brasil',
            uf: fat.cliente.estado || undefined,
            cidade: fat.cliente.cidade || undefined,
            logradouro: fat.cliente.logradouro || undefined,
            numero: fat.cliente.numero || undefined,
            complemento: fat.cliente.complemento || undefined,
            bairro: fat.cliente.bairro || undefined,
            cep: fat.cliente.cep || undefined,
          },
        },
        servico: {
          descricao: fat.descricao || 'Prestação de serviços de consultoria',
          valorServico: fat.valor,
          aliquotaIss: fat.empresa.issAliquota ?? 5.0,
          itemListaServico: fat.empresa.itemListaServico || undefined,
          codigoTributacaoMunicipio: fat.empresa.codigoTributacaoMunicipio || undefined,
          cnae: fat.empresa.cnaeServico || undefined,
        },
        enviarEmail: true,
      });

      await this.prisma.faturamento.update({
        where: { id: faturamentoId },
        data: {
          enotasId: nfse.id,
          status: nfse.status === 'Autorizada' ? StatusFaturamento.EMITIDO : StatusFaturamento.EMITINDO,
          nfseNumero: nfse.numero || null,
          nfseNumeroRPS: nfse.numeroRps || null,
          nfseSerieRPS: nfse.serieRps || null,
          nfseLinkPdf: nfse.linkVisualizacaoPdf || null,
          nfseLinkXml: nfse.linkDownloadXml || null,
          nfseCodigoVerificacao: nfse.codigoVerificacao || null,
          dataEmissao: nfse.status === 'Autorizada' ? new Date() : null,
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Erro ao emitir NFS-e faturamento ${faturamentoId}: ${msg}`);
      await this.prisma.faturamento.update({
        where: { id: faturamentoId },
        data: { status: StatusFaturamento.ERRO, erroEmissao: msg },
      });
      throw new BadRequestException(`Falha na emissão da NFS-e: ${msg}`);
    }
  }

  // ─── Webhook eNotas ────────────────────────────────────────────────────────

  async processarWebhookEnotas(payload: Record<string, unknown>) {
    const enotasId = payload['id'] as string | undefined;
    const evento = payload['evento'] as string | undefined;

    this.logger.log(`Webhook eNotas recebido: evento=${evento} id=${enotasId}`);

    if (!enotasId) return;

    const fat = await this.prisma.faturamento.findFirst({ where: { enotasId } });
    if (!fat) return;

    if (evento === 'NfseEmitida' || (payload['status'] as string) === 'Autorizada') {
      const nfse = payload['nfse'] as Record<string, unknown> | undefined;
      await this.prisma.faturamento.update({
        where: { id: fat.id },
        data: {
          status: StatusFaturamento.EMITIDO,
          nfseNumero: (nfse?.['numero'] as string) || null,
          nfseNumeroRPS: (nfse?.['numeroRps'] as string) || null,
          nfseSerieRPS: (nfse?.['serieRps'] as string) || null,
          nfseLinkPdf: (nfse?.['linkVisualizacaoPdf'] as string) || null,
          nfseLinkXml: (nfse?.['linkDownloadXml'] as string) || null,
          nfseCodigoVerificacao: (nfse?.['codigoVerificacao'] as string) || null,
          dataEmissao: new Date(),
          erroEmissao: null,
        },
      });
      this.logger.log(`Faturamento ${fat.id} → EMITIDO via webhook`);
    } else if (evento === 'NfseCancelada' || (payload['status'] as string) === 'Cancelada') {
      await this.prisma.faturamento.update({
        where: { id: fat.id },
        data: { status: StatusFaturamento.CANCELADO },
      });
    } else if (evento === 'NfseErro' || (payload['status'] as string) === 'Erro') {
      const msg = (payload['mensagemErro'] as string) || 'Erro retornado pelo eNotas';
      await this.prisma.faturamento.update({
        where: { id: fat.id },
        data: { status: StatusFaturamento.ERRO, erroEmissao: msg },
      });
    }
  }

  // ─── Cancelar faturamento ──────────────────────────────────────────────────

  async cancelar(empresaId: string, faturamentoId: string) {
    const fat = await this.prisma.faturamento.findFirst({
      where: { id: faturamentoId, empresaId },
    });
    if (!fat) throw new BadRequestException('Faturamento não encontrado.');

    if (fat.enotasId && fat.status === StatusFaturamento.EMITIDO) {
      await this.enotas.cancelarNfse(fat.enotasId);
    }

    return this.prisma.faturamento.update({
      where: { id: faturamentoId },
      data: { status: StatusFaturamento.CANCELADO },
    });
  }

  // ─── Sincronizar status do eNotas ─────────────────────────────────────────

  async sincronizarStatus(empresaId: string, faturamentoId: string) {
    const fat = await this.prisma.faturamento.findFirst({
      where: { id: faturamentoId, empresaId },
    });
    if (!fat || !fat.enotasId) throw new BadRequestException('Sem ID eNotas para sincronizar.');

    const nfse = await this.enotas.consultarNfse(fat.enotasId);

    await this.prisma.faturamento.update({
      where: { id: faturamentoId },
      data: {
        status: nfse.status === 'Autorizada'
          ? StatusFaturamento.EMITIDO
          : nfse.status === 'Cancelada'
          ? StatusFaturamento.CANCELADO
          : nfse.status === 'Erro'
          ? StatusFaturamento.ERRO
          : StatusFaturamento.EMITINDO,
        nfseNumero: nfse.numero || fat.nfseNumero,
        nfseLinkPdf: nfse.linkVisualizacaoPdf || fat.nfseLinkPdf,
        nfseLinkXml: nfse.linkDownloadXml || fat.nfseLinkXml,
        nfseCodigoVerificacao: nfse.codigoVerificacao || fat.nfseCodigoVerificacao,
        dataEmissao: nfse.status === 'Autorizada' ? (fat.dataEmissao ?? new Date()) : fat.dataEmissao,
        erroEmissao: nfse.mensagemErro || null,
      },
    });

    return this.prisma.faturamento.findUnique({ where: { id: faturamentoId } });
  }

  // ─── Pagamento parcial / total de recebível ────────────────────────────────

  async registrarPagamento(
    empresaId: string,
    recebivelId: string,
    valorPago: number,
    dataPagamento: string,
  ) {
    const rec = await this.prisma.recebivel.findFirst({
      where: { id: recebivelId, empresaId },
    });
    if (!rec) throw new BadRequestException('Recebível não encontrado.');
    if (rec.status === StatusRecebivel.RECEBIDO) throw new BadRequestException('Já quitado.');

    const totalPago = (rec.valorPago ?? 0) + valorPago;
    const quitado = totalPago >= rec.valor;

    return this.prisma.recebivel.update({
      where: { id: recebivelId },
      data: {
        valorPago: totalPago,
        dataPagamento: quitado ? new Date(dataPagamento) : rec.dataPagamento,
        status: quitado
          ? StatusRecebivel.RECEBIDO
          : StatusRecebivel.PARCIALMENTE_RECEBIDO,
      },
    });
  }

  // ─── Reagendar recebível ───────────────────────────────────────────────────

  async reagendarRecebivel(
    empresaId: string,
    recebivelId: string,
    novoVencimento: string,
    observacao?: string,
  ) {
    const rec = await this.prisma.recebivel.findFirst({
      where: { id: recebivelId, empresaId },
    });
    if (!rec) throw new BadRequestException('Recebível não encontrado.');
    if (rec.status === StatusRecebivel.RECEBIDO) {
      throw new BadRequestException('Recebível já quitado não pode ser reagendado.');
    }

    return this.prisma.recebivel.update({
      where: { id: recebivelId },
      data: {
        dataNovoVencimento: new Date(novoVencimento),
        vencimento: new Date(novoVencimento),
        observacoes: observacao
          ? `${(rec as any).observacoes ? (rec as any).observacoes + '\n' : ''}Reagendado: ${observacao}`
          : (rec as any).observacoes,
      } as any,
    });
  }

  // ─── Info primeiro dia útil ────────────────────────────────────────────────

  infoPrimeiroDiaUtil(competencia?: string) {
    const comp = competencia || competenciaAtual();
    const [ano, mes] = comp.split('-').map(Number);
    const diaUtil = primeiroDiaUtilDoMes(ano, mes - 1);
    const hoje = new Date();
    const ehHoje =
      hoje.getFullYear() === diaUtil.getFullYear() &&
      hoje.getMonth() === diaUtil.getMonth() &&
      hoje.getDate() === diaUtil.getDate();

    return {
      competencia: comp,
      primeiroDiaUtil: diaUtil.toISOString().slice(0, 10),
      ehDiaFaturamento: ehHoje,
      hoje: hoje.toISOString().slice(0, 10),
    };
  }
}
