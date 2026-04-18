import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrioridadeNotificacao, StatusAssinatura, StatusProposta } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { AutentiqueService } from '../contratos/autentique.service';
import { MailService } from '../mail/mail.service';
import { CreatePropostaDto } from './dto/create-proposta.dto';

@Injectable()
export class PropostasService {
  private readonly logger = new Logger(PropostasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoesService: NotificacoesService,
    private readonly autentiqueService: AutentiqueService,
    private readonly mailService: MailService,
  ) {}

  private defaultInclude() {
    return {
      cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true, email: true, cpfCnpj: true, contatoPrincipal: true } },
      produtoServico: { select: { id: true, nome: true } },
      contratoGerado: { select: { id: true, titulo: true, status: true, statusAssinatura: true } },
      cobrancas: { orderBy: { ordem: 'asc' as const } },
    };
  }

  async findAll(empresaId: string) {
    return this.prisma.proposta.findMany({
      where: { empresaId },
      include: this.defaultInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(empresaId: string, id: string) {
    const proposta = await this.prisma.proposta.findFirst({
      where: { id, empresaId },
      include: this.defaultInclude(),
    });
    if (!proposta) throw new BadRequestException('Proposta não encontrada.');
    return proposta;
  }

  async create(empresaId: string, data: CreatePropostaDto) {
    const cliente = await this.prisma.cliente.findFirst({ where: { id: data.clienteId, empresaId } });
    if (!cliente) throw new BadRequestException('Cliente não encontrado.');

    const produtoServicoId = data.produtoServicoId
      ? (await this.prisma.produtoServico.findFirst({ where: { id: data.produtoServicoId, empresaId } }))?.id ?? null
      : null;

    const cobrancas = data.cobrancas ?? this.buildCobrancas(data);

    const proposta = await this.prisma.$transaction(async (tx) => {
      const created = await tx.proposta.create({
        data: {
          empresaId,
          clienteId: data.clienteId,
          produtoServicoId,
          titulo: data.titulo.trim(),
          objeto: data.objeto?.trim() || null,
          responsavelInterno: data.responsavelInterno?.trim() || null,
          contatoClienteNome: data.contatoClienteNome?.trim() || cliente.contatoPrincipal || null,
          contatoClienteEmail: data.contatoClienteEmail?.trim().toLowerCase() || cliente.email || null,
          contatoClienteTelefone: data.contatoClienteTelefone?.trim() || cliente.telefone || null,
          clienteRazaoSocial: cliente.razaoSocial,
          clienteCpfCnpj: cliente.cpfCnpj || null,
          clienteEnderecoFormatado: this.formatEndereco(cliente),
          valor: data.valor ?? null,
          moeda: data.moeda?.toUpperCase() || 'BRL',
          formaPagamento: data.formaPagamento?.trim() || null,
          periodicidadeCobranca: data.periodicidadeCobranca?.trim() || null,
          quantidadeParcelas: data.quantidadeParcelas ?? null,
          valorParcela: data.valorParcela ?? null,
          dataInicio: data.dataInicio ? new Date(data.dataInicio) : null,
          dataFim: data.dataFim ? new Date(data.dataFim) : null,
          primeiroVencimento: data.primeiroVencimento ? new Date(data.primeiroVencimento) : null,
          validadeAte: data.validadeAte ? new Date(data.validadeAte) : null,
          observacoes: data.observacoes?.trim() || null,
          textoPropostaBase: data.textoPropostaBase?.trim() || null,
        },
      });

      if (cobrancas.length) {
        await tx.propostaCobranca.createMany({
          data: cobrancas.map((item) => ({
            empresaId,
            propostaId: created.id,
            ordem: item.ordem,
            vencimento: new Date(item.vencimento),
            valor: item.valor,
            descricao: item.descricao ?? null,
          })),
        });
      }

      return created;
    });

    return this.findOne(empresaId, proposta.id);
  }

  async update(empresaId: string, id: string, data: Partial<CreatePropostaDto>) {
    const atual = await this.prisma.proposta.findFirst({
      where: { id, empresaId },
      include: { cobrancas: { orderBy: { ordem: 'asc' } } },
    });
    if (!atual) throw new BadRequestException('Proposta não encontrada.');

    if (atual.status === StatusProposta.ASSINADA || atual.status === StatusProposta.CONVERTIDA) {
      throw new BadRequestException('Proposta já assinada não pode ser editada.');
    }

    const cliente = data.clienteId
      ? await this.prisma.cliente.findFirst({ where: { id: data.clienteId, empresaId } })
      : await this.prisma.cliente.findFirst({ where: { id: atual.clienteId, empresaId } });

    if (!cliente) throw new BadRequestException('Cliente não encontrado.');

    const cobrancas = data.cobrancas ?? (
      data.valor !== undefined || data.periodicidadeCobranca !== undefined || data.primeiroVencimento !== undefined
        ? this.buildCobrancas({ ...atual, ...data } as CreatePropostaDto)
        : null
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.proposta.update({
        where: { id },
        data: {
          clienteId: data.clienteId ?? undefined,
          produtoServicoId: data.produtoServicoId !== undefined
            ? data.produtoServicoId || null
            : undefined,
          titulo: data.titulo?.trim() ?? undefined,
          objeto: data.objeto !== undefined ? data.objeto?.trim() || null : undefined,
          responsavelInterno: data.responsavelInterno !== undefined ? data.responsavelInterno?.trim() || null : undefined,
          contatoClienteNome: data.contatoClienteNome !== undefined ? data.contatoClienteNome?.trim() || null : undefined,
          contatoClienteEmail: data.contatoClienteEmail !== undefined ? data.contatoClienteEmail?.trim().toLowerCase() || null : undefined,
          contatoClienteTelefone: data.contatoClienteTelefone !== undefined ? data.contatoClienteTelefone?.trim() || null : undefined,
          valor: data.valor !== undefined ? data.valor : undefined,
          moeda: data.moeda !== undefined ? data.moeda?.toUpperCase() || 'BRL' : undefined,
          formaPagamento: data.formaPagamento !== undefined ? data.formaPagamento?.trim() || null : undefined,
          periodicidadeCobranca: data.periodicidadeCobranca !== undefined ? data.periodicidadeCobranca?.trim() || null : undefined,
          quantidadeParcelas: data.quantidadeParcelas !== undefined ? data.quantidadeParcelas : undefined,
          valorParcela: data.valorParcela !== undefined ? data.valorParcela : undefined,
          dataInicio: data.dataInicio !== undefined ? (data.dataInicio ? new Date(data.dataInicio) : null) : undefined,
          dataFim: data.dataFim !== undefined ? (data.dataFim ? new Date(data.dataFim) : null) : undefined,
          primeiroVencimento: data.primeiroVencimento !== undefined ? (data.primeiroVencimento ? new Date(data.primeiroVencimento) : null) : undefined,
          validadeAte: data.validadeAte !== undefined ? (data.validadeAte ? new Date(data.validadeAte) : null) : undefined,
          observacoes: data.observacoes !== undefined ? data.observacoes?.trim() || null : undefined,
          textoPropostaBase: data.textoPropostaBase !== undefined ? data.textoPropostaBase?.trim() || null : undefined,
        },
      });

      if (cobrancas) {
        await tx.propostaCobranca.deleteMany({ where: { propostaId: id } });
        if (cobrancas.length) {
          await tx.propostaCobranca.createMany({
            data: cobrancas.map((item) => ({
              empresaId,
              propostaId: id,
              ordem: item.ordem,
              vencimento: new Date(item.vencimento),
              valor: item.valor,
              descricao: item.descricao ?? null,
            })),
          });
        }
      }
    });

    return this.findOne(empresaId, id);
  }

  async sincronizarStatus(empresaId: string, id: string) {
    const proposta = await this.prisma.proposta.findFirst({
      where: { id, empresaId },
      include: { cobrancas: { orderBy: { ordem: 'asc' } } },
    });
    if (!proposta) throw new BadRequestException('Proposta não encontrada.');
    if (!proposta.autentiqueDocId) throw new BadRequestException('Esta proposta não foi enviada ao Autentique.');
    if (proposta.status === StatusProposta.CONVERTIDA) return { message: 'Proposta já convertida.', status: proposta.status };

    const doc = await this.autentiqueService.consultarDocumento(proposta.autentiqueDocId);
    if (!doc) throw new BadRequestException('Documento não encontrado no Autentique.');

    // Considera o documento assinado quando os signatários explícitos (com nome)
    // já assinaram — ignora o signatário auto-adicionado pela conta Autentique (name: null)
    const signatariosExplicitos = doc.signatures.filter((s) => s.name !== null);
    const referencia = signatariosExplicitos.length > 0 ? signatariosExplicitos : doc.signatures;
    const todosAssinaram = referencia.length > 0 && referencia.every((s) => s.signed?.created_at);

    if (!todosAssinaram) {
      return { message: 'Documento ainda não foi totalmente assinado.', status: proposta.status };
    }

    if (proposta.status === StatusProposta.ASSINADA) {
      // Já assinada mas sem contrato — tenta gerar o contrato
      if (!proposta.contratoGeradoId) {
        const contrato = await this.gerarContratoFromProposta(proposta);
        await this.prisma.proposta.update({
          where: { id },
          data: { status: StatusProposta.CONVERTIDA, contratoGeradoId: contrato.id },
        });
        return { message: 'Contrato gerado com sucesso.', status: 'CONVERTIDA' };
      }
      return { message: 'Proposta já assinada.', status: proposta.status };
    }

    const pdfAssinadoUrl = doc.files?.signed ?? null;
    await this.prisma.proposta.update({
      where: { id },
      data: {
        status: StatusProposta.ASSINADA,
        statusAssinatura: StatusAssinatura.ASSINADO,
        dataAssinatura: new Date(),
        pdfAssinadoUrl,
      },
    });

    const contrato = await this.gerarContratoFromProposta({ ...proposta, pdfAssinadoUrl });
    await this.prisma.proposta.update({
      where: { id },
      data: { status: StatusProposta.CONVERTIDA, contratoGeradoId: contrato.id },
    });

    await this.notificacoesService.notificarAdmins({
      empresaId,
      titulo: 'Proposta assinada — contrato gerado',
      mensagem: `Proposta "${proposta.titulo}" assinada. Contrato "${contrato.titulo}" gerado.`,
      link: '/contratos',
      prioridade: PrioridadeNotificacao.ALTA,
    });

    this.logger.log(`Proposta ${id} sincronizada manualmente → contrato ${contrato.id} gerado`);
    return { message: 'Status sincronizado. Contrato gerado.', status: 'CONVERTIDA' };
  }

  async remove(empresaId: string, id: string) {
    const proposta = await this.prisma.proposta.findFirst({ where: { id, empresaId } });
    if (!proposta) throw new BadRequestException('Proposta não encontrada.');
    if (proposta.status === StatusProposta.CONVERTIDA) {
      throw new BadRequestException('Proposta já convertida em contrato não pode ser excluída.');
    }
    await this.prisma.proposta.delete({ where: { id } });
    return { message: 'Proposta excluída com sucesso.' };
  }

  async enviarParaAssinatura(empresaId: string, propostaId: string): Promise<void> {
    const proposta = await this.prisma.proposta.findFirst({
      where: { id: propostaId, empresaId },
      include: { cliente: true, cobrancas: { orderBy: { ordem: 'asc' } } },
    });

    if (!proposta) throw new BadRequestException('Proposta não encontrada.');
    if (proposta.autentiqueDocId) throw new BadRequestException('Esta proposta já foi enviada para assinatura.');

    const signatarioEmail = proposta.contatoClienteEmail || proposta.cliente.email;
    if (!signatarioEmail) throw new BadRequestException('O cliente não possui e-mail para receber o link de assinatura.');

    const signatarioNome = proposta.contatoClienteNome || proposta.cliente.contatoPrincipal || proposta.clienteRazaoSocial || 'Cliente';
    const textoContrato = proposta.textoPropostaBase?.trim() || await this.resolverTextoProposta(proposta) || proposta.titulo;

    const { docId, signUrl } = await this.autentiqueService.enviarDocumento({
      nome: `Proposta — ${proposta.titulo}`,
      textoContrato,
      signatarioNome,
      signatarioEmail,
    });

    await this.prisma.proposta.update({
      where: { id: propostaId },
      data: {
        autentiqueDocId: docId,
        autentiqueSignUrl: signUrl,
        status: StatusProposta.AGUARDANDO_ASSINATURA,
        statusAssinatura: StatusAssinatura.AGUARDANDO_ASSINATURA,
      },
    });

    if (signUrl) {
      void this.mailService.enviarLinkAssinatura({
        to: signatarioEmail,
        toNome: signatarioNome,
        documento: `Proposta — ${proposta.titulo}`,
        linkAssinatura: signUrl,
      });
    }

    await this.notificacoesService.notificarAdmins({
      empresaId,
      titulo: 'Proposta enviada para assinatura',
      mensagem: `Proposta "${proposta.titulo}" enviada para assinatura de ${signatarioEmail}.`,
      link: '/propostas',
      prioridade: PrioridadeNotificacao.ALTA,
    });

    this.logger.log(`Proposta ${propostaId} enviada ao Autentique (doc: ${docId})`);
  }

  async reenviarLink(empresaId: string, propostaId: string): Promise<{ message: string }> {
    const proposta = await this.prisma.proposta.findFirst({
      where: { id: propostaId, empresaId },
      include: { cliente: true },
    });
    if (!proposta) throw new BadRequestException('Proposta não encontrada.');
    if (!proposta.autentiqueSignUrl) throw new BadRequestException('Esta proposta ainda não foi enviada para assinatura.');

    const signatarioEmail = proposta.contatoClienteEmail || proposta.cliente.email;
    if (!signatarioEmail) throw new BadRequestException('O cliente não possui e-mail cadastrado.');

    const signatarioNome = proposta.contatoClienteNome || proposta.cliente.contatoPrincipal || proposta.clienteRazaoSocial || 'Cliente';

    await this.mailService.enviarLinkAssinatura({
      to: signatarioEmail,
      toNome: signatarioNome,
      documento: `Proposta — ${proposta.titulo}`,
      linkAssinatura: proposta.autentiqueSignUrl,
    });

    this.logger.log(`Link de assinatura reenviado para ${signatarioEmail} (proposta: ${propostaId})`);
    return { message: `Link reenviado para ${signatarioEmail}.` };
  }

  async processarWebhookAutentique(payload: Record<string, unknown>): Promise<void> {
    this.logger.debug(`Webhook Autentique recebido: ${JSON.stringify(payload)}`);

    const docPayload = payload['document'] as Record<string, unknown> | undefined;
    const docId =
      (docPayload?.['id'] as string | undefined) ??
      (docPayload?.['token'] as string | undefined) ??
      (payload['document_id'] as string | undefined) ??
      (payload['document_token'] as string | undefined);

    const evento = (payload['event'] as string | undefined)?.toUpperCase();

    this.logger.debug(`Autentique webhook: evento=${evento} docId=${docId}`);

    if (!docId) {
      this.logger.warn('Webhook Autentique sem docId reconhecível. Payload: ' + JSON.stringify(payload));
      return;
    }

    const proposta = await this.prisma.proposta.findFirst({
      where: { autentiqueDocId: docId },
      include: { cobrancas: { orderBy: { ordem: 'asc' } } },
    });

    if (!proposta) {
      this.logger.warn(`Webhook Autentique: nenhuma proposta com autentiqueDocId=${docId}`);
      return;
    }

    const eventosRecusa = ['SIGNATURE_REJECTED', 'DOCUMENT_REJECTED', 'SIGNER_REJECTED'];
    if (evento && eventosRecusa.includes(evento)) {
      await this.prisma.proposta.update({
        where: { id: proposta.id },
        data: { status: StatusProposta.RECUSADA, statusAssinatura: StatusAssinatura.RECUSADO },
      });
      await this.notificacoesService.notificarAdmins({
        empresaId: proposta.empresaId,
        titulo: 'Proposta recusada',
        mensagem: `O cliente recusou assinar a proposta "${proposta.titulo}".`,
        link: '/propostas',
        prioridade: PrioridadeNotificacao.ALTA,
      });
      return;
    }

    const eventosAssinatura = ['DOCUMENT_FINISHED', 'DOCUMENT_SIGNED', 'DOCUMENT_COMPLETED', 'FINISHED', 'SIGNED'];
    if (!evento || !eventosAssinatura.includes(evento)) {
      this.logger.log(`Webhook Autentique: evento "${evento}" ignorado.`);
      return;
    }

    if (proposta.status === StatusProposta.ASSINADA || proposta.status === StatusProposta.CONVERTIDA) return;

    const doc = await this.autentiqueService.consultarDocumento(docId);
    const pdfAssinadoUrl = doc?.files?.signed ?? null;

    await this.prisma.proposta.update({
      where: { id: proposta.id },
      data: {
        status: StatusProposta.ASSINADA,
        statusAssinatura: StatusAssinatura.ASSINADO,
        dataAssinatura: new Date(),
        pdfAssinadoUrl,
      },
    });

    // Gera o contrato automaticamente
    const contrato = await this.gerarContratoFromProposta(proposta);

    await this.prisma.proposta.update({
      where: { id: proposta.id },
      data: { status: StatusProposta.CONVERTIDA, contratoGeradoId: contrato.id },
    });

    await this.notificacoesService.notificarAdmins({
      empresaId: proposta.empresaId,
      titulo: 'Proposta assinada — contrato gerado',
      mensagem: `Proposta "${proposta.titulo}" assinada. Contrato "${contrato.titulo}" gerado e aguardando conferência.`,
      link: '/contratos',
      prioridade: PrioridadeNotificacao.ALTA,
    });

    this.logger.log(`Proposta ${proposta.id} assinada → contrato ${contrato.id} gerado`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async gerarContratoFromProposta(proposta: any) {
    return this.prisma.$transaction(async (tx) => {
      const contrato = await tx.contrato.create({
        data: {
          empresaId: proposta.empresaId,
          clienteId: proposta.clienteId,
          produtoServicoId: proposta.produtoServicoId,
          titulo: proposta.titulo,
          objeto: proposta.objeto,
          responsavelInterno: proposta.responsavelInterno,
          contatoClienteNome: proposta.contatoClienteNome,
          contatoClienteEmail: proposta.contatoClienteEmail,
          contatoClienteTelefone: proposta.contatoClienteTelefone,
          clienteRazaoSocial: proposta.clienteRazaoSocial,
          clienteNomeFantasia: proposta.clienteNomeFantasia,
          clienteCpfCnpj: proposta.clienteCpfCnpj,
          clienteEnderecoFormatado: proposta.clienteEnderecoFormatado,
          valor: proposta.valor,
          moeda: proposta.moeda || 'BRL',
          formaPagamento: proposta.formaPagamento,
          periodicidadeCobranca: proposta.periodicidadeCobranca,
          quantidadeParcelas: proposta.quantidadeParcelas,
          valorParcela: proposta.valorParcela,
          dataInicio: proposta.dataInicio || new Date(),
          primeiroVencimento: proposta.primeiroVencimento,
          status: 'AGUARDANDO_CONFERENCIA',
          statusAssinatura: StatusAssinatura.PENDENTE,
          gerarFinanceiroAutomatico: true,
          observacoes: `Gerado automaticamente a partir da proposta assinada (ID: ${proposta.id}).`,
        },
      });

      if (proposta.cobrancas.length) {
        await tx.contratoCobranca.createMany({
          data: proposta.cobrancas.map((c: { ordem: number; vencimento: Date; valor: number; descricao: string | null }) => ({
            empresaId: proposta.empresaId,
            contratoId: contrato.id,
            ordem: c.ordem,
            vencimento: c.vencimento,
            valor: c.valor,
            descricao: c.descricao,
          })),
        });
      }

      return contrato;
    });
  }

  private buildCobrancas(data: Partial<CreatePropostaDto>): { ordem: number; vencimento: string; valor: number; descricao?: string }[] {
    if (!data.valor || !data.quantidadeParcelas || !data.primeiroVencimento) return [];
    const qtd = data.quantidadeParcelas;
    const base = Math.floor((data.valor * 100) / qtd) / 100;
    const resto = Math.round((data.valor - base * qtd) * 100) / 100;
    const intervalo = this.resolveIntervalo(data.periodicidadeCobranca);
    return Array.from({ length: qtd }).map((_, i) => {
      const dt = new Date(data.primeiroVencimento!);
      dt.setMonth(dt.getMonth() + i * intervalo);
      return {
        ordem: i + 1,
        vencimento: dt.toISOString().slice(0, 10),
        valor: i === qtd - 1 ? base + resto : base,
      };
    });
  }

  private resolveIntervalo(periodicidade?: string | null): number {
    const map: Record<string, number> = { MENSAL: 1, BIMESTRAL: 2, TRIMESTRAL: 3, SEMESTRAL: 6, ANUAL: 12 };
    return map[periodicidade?.toUpperCase() || ''] ?? 1;
  }

  private async resolverTextoProposta(proposta: {
    empresaId: string;
    titulo: string;
    objeto: string | null;
    valor: number | null;
    dataInicio: Date | null;
    dataFim: Date | null;
    clienteRazaoSocial: string | null;
    clienteCpfCnpj: string | null;
    clienteEnderecoFormatado: string | null;
    cobrancas: { ordem: number; vencimento: Date; valor: number; descricao: string | null }[];
  }): Promise<string | null> {
    let modelo: any;
    try {
      modelo = await (this.prisma as any).contratoModelo.findFirst({
        where: { empresaId: proposta.empresaId, padrao: true },
      });
    } catch {
      return null;
    }
    if (!modelo) return null;

    const empresa = await this.prisma.empresa.findFirst({ where: { id: proposta.empresaId } });
    const hoje = new Date();
    const valorFmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    const grade = proposta.cobrancas.length
      ? proposta.cobrancas.map((c) => `${c.ordem}ª parcela — ${c.vencimento.toLocaleDateString('pt-BR')} — ${valorFmt(c.valor)}`).join('\n')
      : 'Grade de cobrança não configurada.';

    const variaveis: Record<string, string> = {
      contratada_nome_razao_social: empresa?.nomeFantasia || empresa?.nome || 'Contratada',
      contratada_documento: empresa?.cnpj || 'não informado',
      contratada_endereco_completo: [empresa?.logradouro, empresa?.numero, empresa?.cidade, empresa?.estado].filter(Boolean).join(', ') || 'não informado',
      contratada_representante_nome: empresa?.representanteNome || 'não informado',
      contratada_representante_cargo: empresa?.representanteCargo || 'não informado',
      contratante_nome_razao_social: proposta.clienteRazaoSocial || 'não informado',
      contratante_documento: proposta.clienteCpfCnpj || 'não informado',
      contratante_endereco_completo: proposta.clienteEnderecoFormatado || 'não informado',
      objeto_contrato: proposta.objeto || proposta.titulo,
      duracao_contrato: proposta.dataInicio && proposta.dataFim
        ? `${proposta.dataInicio.toLocaleDateString('pt-BR')} a ${proposta.dataFim.toLocaleDateString('pt-BR')}`
        : 'a definir',
      data_inicio_contrato: proposta.dataInicio?.toLocaleDateString('pt-BR') || 'a definir',
      data_fim_contrato: proposta.dataFim?.toLocaleDateString('pt-BR') || 'a definir',
      valor_global_contrato: proposta.valor ? valorFmt(proposta.valor) : 'a definir',
      grade_parcelamento_contrato: grade,
      localidade_assinatura: empresa?.cidade || 'não informado',
      dia_assinatura: String(hoje.getDate()),
      mes_assinatura: hoje.toLocaleDateString('pt-BR', { month: 'long' }),
      ano_assinatura: String(hoje.getFullYear()),
    };

    return modelo.conteudo.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key: string) => variaveis[key] ?? '');
  }

  private formatEndereco(cliente: { logradouro?: string | null; numero?: string | null; cidade?: string | null; estado?: string | null }): string | null {
    const parts = [cliente.logradouro, cliente.numero, cliente.cidade, cliente.estado].filter(Boolean);
    return parts.length ? parts.join(', ') : null;
  }
}
