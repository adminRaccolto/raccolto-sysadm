import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrioridadeNotificacao, Prisma, StatusAssinatura, StatusContrato } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { AutentiqueService } from './autentique.service';
import { MailService } from '../mail/mail.service';
import { StorageService } from '../storage/storage.service';
import { ContratoCobrancaDto, CreateContratoDto } from './dto/create-contrato.dto';
import { ensureContratoModelosPadrao } from './contrato-modelos.seed';

const PDFDocument = require('pdfkit') as typeof import('pdfkit');

@Injectable()
export class ContratosService {
  private readonly logger = new Logger(ContratosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoesService: NotificacoesService,
    private readonly autentiqueService: AutentiqueService,
    private readonly mailService: MailService,
    private readonly storageService: StorageService,
  ) {}


  async listModelos(empresaId: string) {
    await ensureContratoModelosPadrao(this.prisma as any, empresaId);
    return (this.prisma as any).contratoModelo.findMany({
      where: { empresaId },
      orderBy: [{ padrao: 'desc' }, { nome: 'asc' }],
    });
  }

  async createModelo(empresaId: string, data: { nome: string; descricao?: string; conteudo: string; ativo?: boolean; padrao?: boolean }) {
    const nome = data.nome.trim();
    const existente = await (this.prisma as any).contratoModelo.findFirst({ where: { empresaId, nome } });
    if (existente) {
      throw new BadRequestException('Já existe um modelo de contrato com este nome.');
    }

    return (this.prisma as any).$transaction(async (tx: any) => {
      if (data.padrao) {
        await tx.contratoModelo.updateMany({ where: { empresaId, padrao: true }, data: { padrao: false } });
      }
      return tx.contratoModelo.create({
        data: {
          empresaId,
          nome,
          descricao: data.descricao?.trim() || null,
          conteudo: data.conteudo,
          ativo: data.ativo ?? true,
          padrao: data.padrao ?? false,
        },
      });
    });
  }

  async updateModelo(empresaId: string, id: string, data: { nome?: string; descricao?: string; conteudo?: string; ativo?: boolean; padrao?: boolean }) {
    const atual = await (this.prisma as any).contratoModelo.findFirst({ where: { id, empresaId } });
    if (!atual) {
      throw new BadRequestException('Modelo de contrato não encontrado.');
    }

    const nome = data.nome !== undefined ? data.nome.trim() : undefined;
    if (nome && nome !== atual.nome) {
      const existente = await (this.prisma as any).contratoModelo.findFirst({ where: { empresaId, nome, id: { not: id } } });
      if (existente) throw new BadRequestException('Já existe um modelo de contrato com este nome.');
    }

    return (this.prisma as any).$transaction(async (tx: any) => {
      if (data.padrao) {
        await tx.contratoModelo.updateMany({ where: { empresaId, padrao: true, id: { not: id } }, data: { padrao: false } });
      }
      return tx.contratoModelo.update({
        where: { id },
        data: {
          ...(nome !== undefined ? { nome } : {}),
          ...(data.descricao !== undefined ? { descricao: data.descricao?.trim() || null } : {}),
          ...(data.conteudo !== undefined ? { conteudo: data.conteudo } : {}),
          ...(data.ativo !== undefined ? { ativo: data.ativo } : {}),
          ...(data.padrao !== undefined ? { padrao: data.padrao } : {}),
        },
      });
    });
  }

  async removeModelo(empresaId: string, id: string) {
    const atual = await (this.prisma as any).contratoModelo.findFirst({ where: { id, empresaId } });
    if (!atual) {
      throw new BadRequestException('Modelo de contrato não encontrado.');
    }
    await (this.prisma as any).contratoModelo.delete({ where: { id } });
    return { message: 'Modelo de contrato excluído com sucesso.' };
  }

  async create(empresaId: string, data: CreateContratoDto) {
    const cliente = await this.validateCliente(empresaId, data.clienteId);
    const produtoServicoId = await this.resolveProdutoServico(empresaId, data.produtoServicoId);
    const codigo = await this.ensureCodigoDisponivel(data.codigo, empresaId);
    const cobrancas = this.buildCobrancasFromDto(data);

    const contrato = await this.prisma.$transaction(async (tx) => {
      const created = await tx.contrato.create({
        data: this.mapContratoData(empresaId, data, cliente, produtoServicoId, codigo, cobrancas),
        include: this.defaultInclude(),
      });

      if (cobrancas.length) {
        await tx.contratoCobranca.createMany({
          data: cobrancas.map((item) => ({
            empresaId,
            contratoId: created.id,
            ordem: item.ordem,
            vencimento: new Date(item.vencimento),
            valor: item.valor,
            descricao: item.descricao ?? null,
          })),
        });
      }

      return created;
    });

    await this.notificarMudancaContrato(empresaId, contrato.id, 'Contrato criado');
    return this.findOne(empresaId, contrato.id);
  }

  async update(empresaId: string, id: string, data: Partial<CreateContratoDto>) {
    const atual = await this.prisma.contrato.findFirst({
      where: { id, empresaId },
      include: { cobrancas: { orderBy: { ordem: 'asc' } } },
    });
    if (!atual) {
      throw new BadRequestException('Contrato não encontrado.');
    }

    const cliente = data.clienteId
      ? await this.validateCliente(empresaId, data.clienteId)
      : await this.validateCliente(empresaId, atual.clienteId);

    const produtoServicoId =
      data.produtoServicoId !== undefined
        ? await this.resolveProdutoServico(empresaId, data.produtoServicoId)
        : undefined;

    const codigo = await this.ensureCodigoDisponivel(data.codigo, empresaId, id);

    const mergedForSchedule = {
      valor: data.valor !== undefined ? data.valor : atual.valor ?? undefined,
      periodicidadeCobranca:
        data.periodicidadeCobranca !== undefined
          ? data.periodicidadeCobranca ?? undefined
          : atual.periodicidadeCobranca ?? undefined,
      quantidadeParcelas:
        data.quantidadeParcelas !== undefined
          ? data.quantidadeParcelas ?? undefined
          : atual.quantidadeParcelas ?? undefined,
      valorParcela:
        data.valorParcela !== undefined ? data.valorParcela ?? undefined : atual.valorParcela ?? undefined,
      primeiroVencimento:
        data.primeiroVencimento !== undefined
          ? data.primeiroVencimento ?? undefined
          : atual.primeiroVencimento?.toISOString().slice(0, 10),
      cobrancas: data.cobrancas,
    } as Partial<CreateContratoDto>;

    const shouldSyncCobrancas =
      data.cobrancas !== undefined ||
      data.valor !== undefined ||
      data.periodicidadeCobranca !== undefined ||
      data.quantidadeParcelas !== undefined ||
      data.valorParcela !== undefined ||
      data.primeiroVencimento !== undefined;

    const cobrancas = shouldSyncCobrancas
      ? this.buildCobrancasFromDto(mergedForSchedule)
      : atual.cobrancas.map((item) => ({
          ordem: item.ordem,
          vencimento: item.vencimento.toISOString().slice(0, 10),
          valor: item.valor,
          descricao: item.descricao ?? undefined,
        }));

    await this.prisma.$transaction(async (tx) => {
      await tx.contrato.update({
        where: { id },
        data: {
          clienteId: data.clienteId ?? undefined,
          produtoServicoId,
          numeroContrato: data.numeroContrato !== undefined ? data.numeroContrato?.trim() || null : undefined,
          codigo: codigo === undefined ? undefined : codigo,
          titulo: data.titulo?.trim() ?? undefined,
          objeto: data.objeto !== undefined ? data.objeto?.trim() || null : undefined,
          tipoContrato: data.tipoContrato !== undefined ? data.tipoContrato?.trim() || null : undefined,
          responsavelInterno:
            data.responsavelInterno !== undefined ? data.responsavelInterno?.trim() || null : undefined,
          contatoClienteNome:
            data.contatoClienteNome !== undefined
              ? data.contatoClienteNome?.trim() || cliente.contatoPrincipal || null
              : cliente.contatoPrincipal || null,
          contatoClienteEmail:
            data.contatoClienteEmail !== undefined
              ? data.contatoClienteEmail?.trim().toLowerCase() || cliente.email || null
              : cliente.email || null,
          contatoClienteTelefone:
            data.contatoClienteTelefone !== undefined
              ? data.contatoClienteTelefone?.trim() || cliente.telefone || null
              : cliente.telefone || null,
          contatoClienteWhatsapp: cliente.whatsapp || null,
          clienteRazaoSocial: cliente.razaoSocial,
          clienteNomeFantasia: cliente.nomeFantasia || null,
          clienteCpfCnpj: cliente.cpfCnpj || null,
          clienteInscricaoEstadual: cliente.inscricaoEstadual || null,
          clienteEnderecoFormatado: this.formatClienteEndereco(cliente),
          valor: data.valor !== undefined ? data.valor : undefined,
          moeda: data.moeda !== undefined ? data.moeda?.trim().toUpperCase() || 'BRL' : undefined,
          formaPagamento: data.formaPagamento !== undefined ? data.formaPagamento?.trim() || null : undefined,
          periodicidadeCobranca:
            data.periodicidadeCobranca !== undefined
              ? data.periodicidadeCobranca?.trim() || null
              : undefined,
          quantidadeParcelas: data.quantidadeParcelas !== undefined ? data.quantidadeParcelas : undefined,
          valorParcela:
            data.valorParcela !== undefined
              ? data.valorParcela
              : shouldSyncCobrancas
                ? this.resolveValorParcela(cobrancas)
                : undefined,
          dataInicio: data.dataInicio ? new Date(data.dataInicio) : undefined,
          dataFim: data.dataFim !== undefined ? (data.dataFim ? new Date(data.dataFim) : null) : undefined,
          primeiroVencimento:
            data.primeiroVencimento !== undefined
              ? data.primeiroVencimento
                ? new Date(data.primeiroVencimento)
                : null
              : shouldSyncCobrancas
                ? (cobrancas[0] ? new Date(cobrancas[0].vencimento) : null)
                : undefined,
          diaVencimento: data.diaVencimento !== undefined ? data.diaVencimento : undefined,
          indiceReajuste: data.indiceReajuste !== undefined ? data.indiceReajuste?.trim() || null : undefined,
          periodicidadeReajuste:
            data.periodicidadeReajuste !== undefined
              ? data.periodicidadeReajuste?.trim() || null
              : undefined,
          renovacaoAutomatica:
            data.renovacaoAutomatica !== undefined ? data.renovacaoAutomatica : undefined,
          status: data.status ?? undefined,
          statusAssinatura: data.statusAssinatura ?? undefined,
          dataEmissao:
            data.dataEmissao !== undefined ? (data.dataEmissao ? new Date(data.dataEmissao) : null) : undefined,
          dataAssinatura:
            data.dataAssinatura !== undefined
              ? data.dataAssinatura
                ? new Date(data.dataAssinatura)
                : null
              : undefined,
          gerarProjetoAutomatico:
            data.gerarProjetoAutomatico !== undefined ? data.gerarProjetoAutomatico : undefined,
          gerarFinanceiroAutomatico:
            data.gerarFinanceiroAutomatico !== undefined ? data.gerarFinanceiroAutomatico : undefined,
          modeloContratoNome:
            data.modeloContratoNome !== undefined ? data.modeloContratoNome?.trim() || null : undefined,
          textoContratoBase:
            data.textoContratoBase !== undefined ? data.textoContratoBase?.trim() || null : undefined,
          observacoes: data.observacoes !== undefined ? data.observacoes?.trim() || null : undefined,
        },
      });

      if (shouldSyncCobrancas) {
        await tx.contratoCobranca.deleteMany({ where: { contratoId: id } });
        if (cobrancas.length) {
          await tx.contratoCobranca.createMany({
            data: cobrancas.map((item) => ({
              empresaId,
              contratoId: id,
              ordem: item.ordem,
              vencimento: new Date(item.vencimento),
              valor: item.valor,
              descricao: item.descricao ?? null,
            })),
          });
        }
      }
    });

    await this.sincronizarRecebiveisAutomaticos(empresaId, id);
    await this.notificarMudancaContrato(empresaId, id, 'Contrato atualizado');
    return this.findOne(empresaId, id);
  }

  async remove(empresaId: string, id: string) {
    const contrato = await this.prisma.contrato.findFirst({
      where: { id, empresaId },
      include: { _count: { select: { projetos: true, recebiveis: true } } },
    });

    if (!contrato) {
      throw new BadRequestException('Contrato não encontrado.');
    }

    if (contrato._count.projetos > 0 || contrato._count.recebiveis > 0) {
      throw new BadRequestException(
        'Este contrato já possui projetos ou financeiro vinculado. Altere o status em vez de excluir.',
      );
    }

    await this.prisma.contrato.delete({ where: { id } });
    return { message: 'Contrato excluído com sucesso.' };
  }

  async findAll(empresaId: string) {
    return this.prisma.contrato.findMany({
      where: { empresaId },
      include: this.defaultInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(empresaId: string, id: string) {
    const contrato = await this.prisma.contrato.findFirst({
      where: { id, empresaId },
      include: {
        ...this.defaultInclude(),
        recebiveis: { orderBy: { vencimento: 'asc' } },
      },
    });

    if (!contrato) {
      throw new BadRequestException('Contrato não encontrado.');
    }

    return contrato;
  }

  private async resolverTextoContrato(contrato: {
    empresaId: string;
    modeloContratoNome: string | null;
    titulo: string;
    objeto: string | null;
    valor: number | null;
    dataInicio: Date;
    dataFim: Date | null;
    clienteRazaoSocial: string | null;
    clienteCpfCnpj: string | null;
    clienteEnderecoFormatado: string | null;
    contatoClienteNome: string | null;
    cobrancas?: { ordem: number; vencimento: Date; valor: number; descricao: string | null }[];
  }): Promise<string | null> {
    let modelo: any;
    try {
      modelo = await (this.prisma as any).contratoModelo.findFirst({
        where: {
          empresaId: contrato.empresaId,
          ...(contrato.modeloContratoNome ? { nome: contrato.modeloContratoNome } : { padrao: true }),
        },
      });
    } catch {
      return null;
    }
    if (!modelo) return null;

    const empresa = await this.prisma.empresa.findFirst({ where: { id: contrato.empresaId } });

    const dataInicio = contrato.dataInicio.toLocaleDateString('pt-BR');
    const dataFim = contrato.dataFim ? contrato.dataFim.toLocaleDateString('pt-BR') : 'indeterminado';
    const valorTotal = contrato.valor
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contrato.valor)
      : 'a definir';

    const grade = contrato.cobrancas?.length
      ? contrato.cobrancas
          .map((c) => `${c.ordem}ª parcela — ${c.vencimento.toLocaleDateString('pt-BR')} — ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.valor)}${c.descricao ? ` (${c.descricao})` : ''}`)
          .join('\n')
      : 'Grade de cobrança não configurada.';

    const hoje = new Date();
    const variaveis: Record<string, string> = {
      contratada_nome_razao_social: empresa?.nomeFantasia || empresa?.nome || 'Contratada',
      contratada_documento: empresa?.cnpj || 'não informado',
      contratada_endereco_completo: [empresa?.logradouro, empresa?.numero, empresa?.cidade, empresa?.estado].filter(Boolean).join(', ') || 'não informado',
      contratada_representante_nome: empresa?.representanteNome || 'não informado',
      contratada_representante_cargo: empresa?.representanteCargo || 'não informado',
      contratante_nome_razao_social: contrato.clienteRazaoSocial || 'Cliente não informado',
      contratante_documento: contrato.clienteCpfCnpj || 'não informado',
      contratante_endereco_completo: contrato.clienteEnderecoFormatado || 'não informado',
      objeto_contrato: contrato.objeto || contrato.titulo,
      duracao_contrato: `${dataInicio} a ${dataFim}`,
      data_inicio_contrato: dataInicio,
      data_fim_contrato: dataFim,
      valor_global_contrato: valorTotal,
      grade_parcelamento_contrato: grade,
      localidade_assinatura: empresa?.cidade || 'não informado',
      dia_assinatura: String(hoje.getDate()),
      mes_assinatura: hoje.toLocaleDateString('pt-BR', { month: 'long' }),
      ano_assinatura: String(hoje.getFullYear()),
    };

    return modelo.conteudo.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key: string) => variaveis[key] ?? '');
  }

  async enviarParaAssinatura(empresaId: string, contratoId: string): Promise<void> {
    const contrato = await this.prisma.contrato.findFirst({
      where: { id: contratoId, empresaId },
      include: { cliente: true },
    });

    if (!contrato) throw new BadRequestException('Contrato não encontrado.');

    if (contrato.autentiqueDocId) {
      throw new BadRequestException('Este contrato já foi enviado para assinatura.');
    }

    const signatarioEmail = contrato.contatoClienteEmail || contrato.cliente.email;
    if (!signatarioEmail) {
      throw new BadRequestException('O cliente não possui e-mail cadastrado para receber o link de assinatura.');
    }

    const textoContrato = contrato.textoContratoBase?.trim()
      || await this.resolverTextoContrato(contrato)
      || contrato.titulo;
    const signatarioNome = contrato.contatoClienteNome || contrato.cliente.contatoPrincipal || contrato.clienteRazaoSocial || 'Cliente';

    const { docId, signUrl } = await this.autentiqueService.enviarDocumento({
      nome: contrato.titulo,
      textoContrato,
      signatarioNome,
      signatarioEmail,
    });

    await this.prisma.contrato.update({
      where: { id: contratoId },
      data: {
        autentiqueDocId: docId,
        autentiqueSignUrl: signUrl,
        statusAssinatura: StatusAssinatura.AGUARDANDO_ASSINATURA,
      },
    });

    if (signUrl) {
      void this.mailService.enviarLinkAssinatura({
        to: signatarioEmail,
        toNome: signatarioNome,
        documento: contrato.titulo,
        linkAssinatura: signUrl,
      });
    }

    await this.notificacoesService.notificarAdmins({
      empresaId,
      titulo: 'Assinatura enviada',
      mensagem: `Contrato "${contrato.titulo}" enviado para assinatura digital de ${signatarioEmail}.`,
      link: '/contratos',
      prioridade: PrioridadeNotificacao.ALTA,
    });

    this.logger.log(`Contrato ${contratoId} enviado ao Autentique (doc: ${docId})`);
  }

  async reenviarAutentique(empresaId: string, contratoId: string): Promise<void> {
    const contrato = await this.prisma.contrato.findFirst({
      where: { id: contratoId, empresaId },
      include: { cliente: true },
    });
    if (!contrato) throw new BadRequestException('Contrato não encontrado.');
    if (contrato.statusAssinatura === StatusAssinatura.ASSINADO) throw new BadRequestException('Este contrato já foi assinado.');

    await this.prisma.contrato.update({
      where: { id: contratoId },
      data: { autentiqueDocId: null, autentiqueSignUrl: null },
    });

    const signatarioEmail = contrato.contatoClienteEmail || contrato.cliente.email;
    if (!signatarioEmail) throw new BadRequestException('O cliente não possui e-mail cadastrado.');

    const textoContrato = contrato.textoContratoBase?.trim()
      || await this.resolverTextoContrato(contrato)
      || contrato.titulo;
    const signatarioNome = contrato.contatoClienteNome || contrato.cliente.contatoPrincipal || contrato.clienteRazaoSocial || 'Cliente';

    const { docId, signUrl } = await this.autentiqueService.enviarDocumento({
      nome: contrato.titulo,
      textoContrato,
      signatarioNome,
      signatarioEmail,
    });

    await this.prisma.contrato.update({
      where: { id: contratoId },
      data: {
        autentiqueDocId: docId,
        autentiqueSignUrl: signUrl,
        statusAssinatura: StatusAssinatura.AGUARDANDO_ASSINATURA,
      },
    });

    if (signUrl) {
      void this.mailService.enviarLinkAssinatura({
        to: signatarioEmail,
        toNome: signatarioNome,
        documento: contrato.titulo,
        linkAssinatura: signUrl,
      });
    }

    this.logger.log(`Contrato ${contratoId} reenviado ao Autentique (doc: ${docId})`);
  }

  async reenviarLink(empresaId: string, contratoId: string): Promise<{ message: string }> {
    const contrato = await this.prisma.contrato.findFirst({
      where: { id: contratoId, empresaId },
      include: { cliente: true },
    });
    if (!contrato) throw new BadRequestException('Contrato não encontrado.');
    if (!contrato.autentiqueSignUrl) throw new BadRequestException('Este contrato ainda não foi enviado para assinatura.');

    const signatarioEmail = contrato.contatoClienteEmail || contrato.cliente.email;
    if (!signatarioEmail) throw new BadRequestException('O cliente não possui e-mail cadastrado.');

    const signatarioNome = contrato.contatoClienteNome || contrato.cliente.contatoPrincipal || contrato.clienteRazaoSocial || 'Cliente';

    await this.mailService.enviarLinkAssinatura({
      to: signatarioEmail,
      toNome: signatarioNome,
      documento: contrato.titulo,
      linkAssinatura: contrato.autentiqueSignUrl,
    });

    this.logger.log(`Link de assinatura reenviado para ${signatarioEmail} (contrato: ${contratoId})`);
    return { message: `Link reenviado para ${signatarioEmail}.` };
  }

  async processarWebhookAutentique(payload: Record<string, unknown>): Promise<void> {
    const docId = (payload['document'] as Record<string, unknown> | undefined)?.['token'] as string | undefined
      ?? payload['document_token'] as string | undefined;
    const evento = payload['event'] as string | undefined;

    if (!docId || evento !== 'DOCUMENT_FINISHED') {
      if (evento === 'SIGNATURE_REJECTED') {
        this.logger.warn(`Webhook Autentique: assinatura recusada para doc ${docId}`);
        const contrato = docId ? await this.prisma.contrato.findFirst({ where: { autentiqueDocId: docId } }) : null;
        if (contrato) {
          await this.prisma.contrato.update({ where: { id: contrato.id }, data: { statusAssinatura: StatusAssinatura.RECUSADO } });
          await this.notificacoesService.notificarAdmins({
            empresaId: contrato.empresaId,
            titulo: 'Assinatura recusada',
            mensagem: `O cliente recusou assinar o contrato "${contrato.titulo}".`,
            link: '/contratos',
            prioridade: PrioridadeNotificacao.ALTA,
          });
        }
      } else {
        this.logger.log(`Webhook Autentique ignorado — evento: ${evento}`);
      }
      return;
    }

    const contrato = await this.prisma.contrato.findFirst({
      where: { autentiqueDocId: docId },
    });

    if (!contrato) {
      this.logger.warn(`Webhook Autentique: nenhum contrato encontrado para docId ${docId}`);
      return;
    }

    if (contrato.statusAssinatura === StatusAssinatura.ASSINADO) return;

    // Consulta o documento para pegar o PDF assinado
    const doc = await this.autentiqueService.consultarDocumento(docId);
    const pdfAssinadoUrl = doc?.files?.signed ?? null;

    await this.prisma.contrato.update({
      where: { id: contrato.id },
      data: {
        statusAssinatura: StatusAssinatura.ASSINADO,
        dataAssinatura: new Date(),
        pdfAssinadoUrl,
      },
    });

    await this.sincronizarRecebiveisAutomaticos(contrato.empresaId, contrato.id);

    await this.notificacoesService.notificarAdmins({
      empresaId: contrato.empresaId,
      titulo: 'Contrato assinado',
      mensagem: `Contrato "${contrato.titulo}" foi assinado digitalmente. Financeiro gerado automaticamente.`,
      link: '/contratos',
      prioridade: PrioridadeNotificacao.ALTA,
    });

    this.logger.log(`Contrato ${contrato.id} marcado como ASSINADO via webhook Autentique`);
  }

  private async notificarMudancaContrato(empresaId: string, contratoId: string, acao: string) {
    const contrato = await this.prisma.contrato.findFirst({
      where: { id: contratoId, empresaId },
      include: { cliente: true },
    });
    if (!contrato) return;

    let mensagem = `${acao}: ${contrato.titulo}.`;
    let prioridade: PrioridadeNotificacao = PrioridadeNotificacao.MEDIA;

    if (
      contrato.statusAssinatura === StatusAssinatura.ENVIADO ||
      contrato.statusAssinatura === StatusAssinatura.AGUARDANDO_ASSINATURA
    ) {
      mensagem = `Contrato ${contrato.titulo} enviado para assinatura.`;
      prioridade = PrioridadeNotificacao.ALTA;
    }

    if (contrato.statusAssinatura === StatusAssinatura.ASSINADO) {
      mensagem = `Contrato ${contrato.titulo} foi assinado e está pronto para desdobramentos.`;
      prioridade = PrioridadeNotificacao.ALTA;
    }

    await this.notificacoesService.notificarAdmins({
      empresaId,
      titulo: 'Contrato',
      mensagem,
      link: '/contratos',
      prioridade,
    });
  }

  private async sincronizarRecebiveisAutomaticos(empresaId: string, contratoId: string) {
    const contrato = await this.prisma.contrato.findFirst({
      where: { id: contratoId, empresaId },
      include: {
        produtoServico: true,
        cobrancas: { orderBy: { ordem: 'asc' as const } },
      },
    });

    if (!contrato) return;

    if (!(contrato.gerarFinanceiroAutomatico && contrato.statusAssinatura === StatusAssinatura.ASSINADO)) {
      await this.prisma.recebivel.deleteMany({ where: { contratoId, origemAutomatica: true } });
      return;
    }

    const contaGerencialId = contrato.produtoServico?.contaGerencialReceita
      ? (
          await this.prisma.contaGerencial.findFirst({
            where: { id: contrato.produtoServico.contaGerencialReceita, empresaId },
            select: { id: true },
          })
        )?.id ?? null
      : null;

    await this.prisma.$transaction(async (tx) => {
      await tx.recebivel.deleteMany({ where: { contratoId, origemAutomatica: true } });
      const cobrancas = contrato.cobrancas.length
        ? contrato.cobrancas.map((item) => ({
            ordem: item.ordem,
            vencimento: item.vencimento,
            valor: item.valor,
            descricao: item.descricao ?? undefined,
          }))
        : this.buildCobrancasFromDto({
            valor: contrato.valor ?? undefined,
            quantidadeParcelas: contrato.quantidadeParcelas ?? undefined,
            valorParcela: contrato.valorParcela ?? undefined,
            primeiroVencimento: contrato.primeiroVencimento?.toISOString().slice(0, 10),
            periodicidadeCobranca: contrato.periodicidadeCobranca ?? undefined,
          });

      if (!cobrancas.length) return;

      await tx.recebivel.createMany({
        data: cobrancas.map((item, index) => ({
          empresaId: contrato.empresaId,
          clienteId: contrato.clienteId,
          contratoId: contrato.id,
          produtoServicoId: contrato.produtoServicoId,
          contaGerencialId,
          descricao: item.descricao || `${contrato.titulo} - parcela ${index + 1}/${cobrancas.length}`,
          parcelaNumero: index + 1,
          totalParcelas: cobrancas.length,
          valor: item.valor,
          vencimento: new Date(item.vencimento),
          origemAutomatica: true,
        })),
      });
    });
  }

  private async validateCliente(empresaId: string, clienteId: string) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id: clienteId, empresaId },
    });

    if (!cliente) {
      throw new BadRequestException('Cliente não encontrado nesta empresa.');
    }

    return cliente;
  }

  private async resolveProdutoServico(empresaId: string, produtoServicoId?: string | null) {
    if (!produtoServicoId) return null;
    const produto = await this.prisma.produtoServico.findFirst({
      where: { id: produtoServicoId, empresaId },
    });
    if (!produto) {
      throw new BadRequestException('Produto/serviço não encontrado nesta empresa.');
    }
    return produto.id;
  }

  private async ensureCodigoDisponivel(codigo?: string | null, empresaId?: string, contratoId?: string) {
    if (codigo === undefined) return undefined;
    const normalized = codigo?.trim() || null;
    if (!normalized || !empresaId) return normalized;

    const contratoExistente = await this.prisma.contrato.findFirst({
      where: {
        codigo: normalized,
        empresaId,
        ...(contratoId ? { id: { not: contratoId } } : {}),
      },
    });

    if (contratoExistente) {
      throw new BadRequestException('Já existe contrato com este código.');
    }

    return normalized;
  }

  private mapContratoData(
    empresaId: string,
    data: CreateContratoDto,
    cliente: Awaited<ReturnType<ContratosService['validateCliente']>>,
    produtoServicoId: string | null,
    codigo: string | null | undefined,
    cobrancas: Array<{ ordem: number; vencimento: string; valor: number; descricao?: string }>,
  ): Prisma.ContratoUncheckedCreateInput {
    return {
      empresaId,
      clienteId: data.clienteId,
      produtoServicoId,
      numeroContrato: data.numeroContrato?.trim() || null,
      codigo: codigo || null,
      titulo: data.titulo.trim(),
      objeto: data.objeto?.trim() || null,
      tipoContrato: data.tipoContrato?.trim() || null,
      responsavelInterno: data.responsavelInterno?.trim() || null,
      contatoClienteNome: data.contatoClienteNome?.trim() || cliente.contatoPrincipal || null,
      contatoClienteEmail: data.contatoClienteEmail?.trim().toLowerCase() || cliente.email || null,
      contatoClienteTelefone: data.contatoClienteTelefone?.trim() || cliente.telefone || null,
      contatoClienteWhatsapp: cliente.whatsapp || null,
      clienteRazaoSocial: cliente.razaoSocial,
      clienteNomeFantasia: cliente.nomeFantasia || null,
      clienteCpfCnpj: cliente.cpfCnpj || null,
      clienteInscricaoEstadual: cliente.inscricaoEstadual || null,
      clienteEnderecoFormatado: this.formatClienteEndereco(cliente),
      valor: data.valor,
      moeda: data.moeda?.trim().toUpperCase() || 'BRL',
      formaPagamento: data.formaPagamento?.trim() || null,
      periodicidadeCobranca: data.periodicidadeCobranca?.trim() || null,
      quantidadeParcelas: data.quantidadeParcelas,
      valorParcela: data.valorParcela ?? this.resolveValorParcela(cobrancas),
      dataInicio: new Date(data.dataInicio),
      dataFim: data.dataFim ? new Date(data.dataFim) : null,
      primeiroVencimento: data.primeiroVencimento ? new Date(data.primeiroVencimento) : (cobrancas[0] ? new Date(cobrancas[0].vencimento) : null),
      diaVencimento: data.diaVencimento,
      indiceReajuste: data.indiceReajuste?.trim() || null,
      periodicidadeReajuste: data.periodicidadeReajuste?.trim() || null,
      renovacaoAutomatica: data.renovacaoAutomatica ?? false,
      status: data.status,
      statusAssinatura: data.statusAssinatura,
      dataEmissao: data.dataEmissao ? new Date(data.dataEmissao) : null,
      dataAssinatura: data.dataAssinatura ? new Date(data.dataAssinatura) : null,
      gerarProjetoAutomatico: data.gerarProjetoAutomatico ?? false,
      gerarFinanceiroAutomatico: data.gerarFinanceiroAutomatico ?? true,
      modeloContratoNome: data.modeloContratoNome?.trim() || null,
      textoContratoBase: data.textoContratoBase?.trim() || null,
      observacoes: data.observacoes?.trim() || null,
    };
  }

  private buildCobrancasFromDto(data: Partial<CreateContratoDto>) {
    if (data.cobrancas?.length) {
      return data.cobrancas
        .map((item) => ({
          ordem: Number(item.ordem),
          vencimento: item.vencimento,
          valor: Number(item.valor),
          descricao: item.descricao?.trim() || undefined,
        }))
        .filter((item) => item.ordem > 0 && item.vencimento && Number.isFinite(item.valor))
        .sort((a, b) => a.ordem - b.ordem);
    }

    const valorTotal = data.valor ?? null;
    const quantidadeParcelas = data.quantidadeParcelas && data.quantidadeParcelas > 0 ? data.quantidadeParcelas : 1;
    const primeiroVencimento = data.primeiroVencimento;
    if (!valorTotal || !primeiroVencimento) return [];

    const intervaloMeses = this.resolveIntervaloMeses(data.periodicidadeCobranca);
    const valorParcela = data.valorParcela ?? Number((valorTotal / quantidadeParcelas).toFixed(2));

    return Array.from({ length: quantidadeParcelas }).map((_, index) => {
      const vencimento = new Date(primeiroVencimento);
      vencimento.setMonth(vencimento.getMonth() + index * intervaloMeses);
      return {
        ordem: index + 1,
        vencimento: vencimento.toISOString().slice(0, 10),
        valor: valorParcela,
        descricao: `Parcela ${index + 1}/${quantidadeParcelas}`,
      };
    });
  }

  private resolveIntervaloMeses(periodicidade?: string | null) {
    switch ((periodicidade || 'MENSAL').toUpperCase()) {
      case 'BIMESTRAL':
        return 2;
      case 'TRIMESTRAL':
        return 3;
      case 'QUADRIMESTRAL':
        return 4;
      case 'SEMESTRAL':
        return 6;
      case 'ANUAL':
        return 12;
      default:
        return 1;
    }
  }

  private resolveValorParcela(cobrancas: Array<{ valor: number }>) {
    if (!cobrancas.length) return null;
    if (cobrancas.every((item) => item.valor === cobrancas[0].valor)) return cobrancas[0].valor;
    return null;
  }

  private formatClienteEndereco(cliente: Awaited<ReturnType<ContratosService['validateCliente']>>) {
    const partes = [
      cliente.logradouro,
      cliente.numero,
      cliente.complemento,
      cliente.bairro,
      cliente.cidade,
      cliente.estado,
      cliente.cep,
    ].filter(Boolean);
    return partes.length ? partes.join(', ') : null;
  }

  private defaultInclude() {
    return {
      cliente: true,
      produtoServico: true,
      cobrancas: {
        orderBy: { ordem: 'asc' as const },
      },
    } satisfies Prisma.ContratoInclude;
  }

  async gerarPdfBuffer(empresaId: string, contratoId: string): Promise<{ buffer: Buffer; titulo: string }> {
    const contrato = await this.prisma.contrato.findFirst({
      where: { id: contratoId, empresaId },
      include: { cobrancas: { orderBy: { ordem: 'asc' } } },
    });
    if (!contrato) throw new BadRequestException('Contrato não encontrado.');

    const texto = await this.resolverTextoContrato(contrato as any);
    const titulo = contrato.titulo;
    const buffer = await this.gerarPdfDoTexto(titulo, texto ?? titulo);
    return { buffer, titulo };
  }

  async assinarEmpresa(empresaId: string, contratoId: string): Promise<{ message: string; pdfUrl: string | null }> {
    const contrato = await this.prisma.contrato.findFirst({
      where: { id: contratoId, empresaId },
      include: { cobrancas: { orderBy: { ordem: 'asc' } } },
    });
    if (!contrato) throw new BadRequestException('Contrato não encontrado.');
    if (contrato.statusAssinatura === StatusAssinatura.ASSINADO) {
      throw new BadRequestException('Contrato já está assinado por ambas as partes.');
    }

    const { buffer, titulo } = await this.gerarPdfBuffer(empresaId, contratoId);

    let pdfUrl: string | null = null;
    try {
      pdfUrl = await this.storageService.uploadFile(
        buffer,
        `${titulo}-assinado.pdf`,
        'application/pdf',
        'contratos',
      );
    } catch (err) {
      this.logger.error('Falha ao fazer upload do PDF assinado:', err);
    }

    await this.prisma.contrato.update({
      where: { id: contratoId },
      data: {
        statusAssinatura: StatusAssinatura.ASSINADO,
        status: StatusContrato.ATIVO,
        dataAssinatura: new Date(),
        ...(pdfUrl ? { pdfAssinadoUrl: pdfUrl } : {}),
      },
    });

    const email = contrato.contatoClienteEmail;
    if (email) {
      try {
        await this.mailService.enviarContratoAssinado({
          to: email,
          toNome: contrato.contatoClienteNome || contrato.clienteRazaoSocial || 'Cliente',
          titulo,
          pdfBuffer: buffer,
          pdfNome: `${titulo}-assinado.pdf`,
        });
      } catch (err) {
        this.logger.error('Falha ao enviar e-mail com contrato assinado:', err);
      }
    }

    await this.sincronizarRecebiveisAutomaticos(empresaId, contratoId);
    await this.notificacoesService.notificarAdmins({
      empresaId,
      titulo: 'Contrato assinado pela empresa',
      mensagem: `Contrato "${titulo}" foi assinado pela empresa e ${email ? 'enviado ao cliente' : 'finalizado'}.`,
      link: '/contratos',
      prioridade: PrioridadeNotificacao.ALTA,
    });

    return { message: 'Contrato assinado pela empresa com sucesso.', pdfUrl };
  }

  private gerarPdfDoTexto(titulo: string, texto: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 60, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).font('Helvetica-Bold').text(titulo, { align: 'center' });
      doc.moveDown(1.5);
      doc.fontSize(11).font('Helvetica');

      for (const linha of texto.split('\n')) {
        const trimmed = linha.trim();
        if (!trimmed) { doc.moveDown(0.5); continue; }
        if (/^[\d]+\.|^CLÁUSULA|^[A-ZÁÉÍÓÚ\s]{8,}$/.test(trimmed)) {
          doc.font('Helvetica-Bold').text(trimmed).font('Helvetica');
        } else {
          doc.text(trimmed, { align: 'justify' });
        }
        doc.moveDown(0.3);
      }

      doc.moveDown(4);
      doc.fontSize(10).font('Helvetica').fillColor('#333333');
      const assinado = `Assinado eletronicamente em ${new Date().toLocaleDateString('pt-BR')}`;
      doc.text(assinado, { align: 'center' });

      doc.end();
    });
  }
}
