import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { StatusAssinaturaArato, StatusRecebivel } from '@prisma/client';
import axios from 'axios';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssinaturaAratoDto } from './dto/create-assinatura-arato.dto';
import { PagarParcelaDto } from './dto/pagar-parcela.dto';

const PARCELAS_INICIAIS = 12;

@Injectable()
export class AssinaturasAratoService {
  private readonly logger = new Logger(AssinaturasAratoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async create(empresaId: string, dto: CreateAssinaturaAratoDto) {
    await this.ensureCliente(empresaId, dto.clienteId);
    await this.ensureProduto(empresaId, dto.produtoServicoId);

    const assinatura = await this.prisma.assinaturaArato.create({
      data: {
        empresaId,
        clienteId: dto.clienteId,
        produtoServicoId: dto.produtoServicoId,
        contaGerencialId: dto.contaGerencialId ?? null,
        valorMensal: dto.valorMensal,
        diaVencimento: dto.diaVencimento,
        dataInicio: new Date(dto.dataInicio),
        status: StatusAssinaturaArato.ATIVA,
      },
      include: { cliente: true, produtoServico: true },
    });

    const inicio = new Date(dto.dataInicio);
    const parcelas = Array.from({ length: PARCELAS_INICIAIS }).map((_, i) => {
      const venc = new Date(inicio.getFullYear(), inicio.getMonth() + i, dto.diaVencimento);
      return {
        empresaId,
        clienteId: dto.clienteId,
        produtoServicoId: dto.produtoServicoId,
        contaGerencialId: dto.contaGerencialId ?? null,
        assinaturaAratoId: assinatura.id,
        descricao: `Assinatura Arato — parcela ${i + 1}/${PARCELAS_INICIAIS}`,
        parcelaNumero: i + 1,
        totalParcelas: PARCELAS_INICIAIS,
        grupoParcelamento: `ARATO-${assinatura.id}`,
        valor: dto.valorMensal,
        vencimento: venc,
        origemAutomatica: false,
        status: StatusRecebivel.ABERTO,
      };
    });

    await this.prisma.recebivel.createMany({ data: parcelas });

    return this.findOne(empresaId, assinatura.id);
  }

  async findAll(empresaId: string) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const assinaturas = await this.prisma.assinaturaArato.findMany({
      where: { empresaId },
      include: {
        cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true, email: true } },
        produtoServico: { select: { id: true, nome: true } },
        recebiveis: { select: { id: true, status: true, vencimento: true, parcelaNumero: true, valor: true, dataPagamento: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return assinaturas.map((a) => ({
      ...a,
      parcelasVencidas: a.recebiveis.filter(
        (r) => r.status !== StatusRecebivel.RECEBIDO && r.status !== StatusRecebivel.CANCELADO && r.vencimento < hoje,
      ).length,
    }));
  }

  async findOne(empresaId: string, id: string) {
    const a = await this.prisma.assinaturaArato.findFirst({
      where: { id, empresaId },
      include: {
        cliente: true,
        produtoServico: true,
        recebiveis: { orderBy: { parcelaNumero: 'asc' } },
      },
    });
    if (!a) throw new BadRequestException('Assinatura não encontrada.');
    return a;
  }

  async pagarParcela(empresaId: string, recebivelId: string, dto: PagarParcelaDto) {
    const recebivel = await this.prisma.recebivel.findFirst({
      where: { id: recebivelId, empresaId },
    });
    if (!recebivel) throw new BadRequestException('Recebível não encontrado.');
    if (!recebivel.assinaturaAratoId) throw new BadRequestException('Recebível não pertence a uma assinatura Arato.');

    await this.prisma.recebivel.update({
      where: { id: recebivelId },
      data: {
        status: StatusRecebivel.RECEBIDO,
        dataPagamento: new Date(dto.dataPagamento),
        valorPago: dto.valorPago ?? recebivel.valor,
      },
    });

    // Auto-reativação: se a assinatura está suspensa e não há mais parcelas vencidas em aberto
    const assinatura = await this.prisma.assinaturaArato.findUnique({
      where: { id: recebivel.assinaturaAratoId },
    });
    if (assinatura?.status === StatusAssinaturaArato.SUSPENSA) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const vencidasRestantes = await this.prisma.recebivel.count({
        where: {
          assinaturaAratoId: recebivel.assinaturaAratoId,
          status: { notIn: [StatusRecebivel.RECEBIDO, StatusRecebivel.CANCELADO] },
          vencimento: { lt: hoje },
        },
      });
      if (vencidasRestantes === 0) {
        await this.reativarArato(empresaId, recebivel.assinaturaAratoId);
      }
    }

    return this.findOne(empresaId, recebivel.assinaturaAratoId);
  }

  async enviarAviso(empresaId: string, id: string) {
    const assinatura = await this.findOne(empresaId, id);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const parcelasVencidas = assinatura.recebiveis.filter(
      (r) => r.status !== StatusRecebivel.RECEBIDO && r.status !== StatusRecebivel.CANCELADO && r.vencimento < hoje,
    ).length;

    if (parcelasVencidas < 3) {
      throw new BadRequestException(`Aviso requer ao menos 3 parcelas vencidas. Atualmente: ${parcelasVencidas}.`);
    }

    const email = assinatura.cliente.email;
    if (email) {
      await this.mail.enviarAvisoAtrasoArato({
        to: email,
        toNome: assinatura.cliente.nomeFantasia ?? assinatura.cliente.razaoSocial,
        parcelasVencidas,
      });
    }

    await this.prisma.assinaturaArato.update({
      where: { id },
      data: { avisoEnviado: true },
    });

    return { message: 'Aviso enviado com sucesso.' };
  }

  async suspender(empresaId: string, id: string) {
    const assinatura = await this.findOne(empresaId, id);
    if (assinatura.status === StatusAssinaturaArato.SUSPENSA) {
      throw new BadRequestException('Assinatura já está suspensa.');
    }

    const cpfCnpj = assinatura.cliente.cpfCnpj;
    if (cpfCnpj) {
      await this.callAratoAdmin('suspender-cliente', { cpfCnpj });
    }

    await this.prisma.assinaturaArato.update({
      where: { id },
      data: { status: StatusAssinaturaArato.SUSPENSA },
    });

    return { message: 'Assinatura suspensa com sucesso.' };
  }

  async reativar(empresaId: string, id: string) {
    await this.reativarArato(empresaId, id);
    return { message: 'Assinatura reativada com sucesso.' };
  }

  private async reativarArato(empresaId: string, id: string) {
    const assinatura = await this.findOne(empresaId, id);
    const cpfCnpj = assinatura.cliente.cpfCnpj;
    if (cpfCnpj) {
      await this.callAratoAdmin('reativar-cliente', { cpfCnpj });
    }
    await this.prisma.assinaturaArato.update({
      where: { id },
      data: { status: StatusAssinaturaArato.ATIVA, avisoEnviado: false },
    });
  }

  private async callAratoAdmin(endpoint: string, body: Record<string, string>) {
    const aratoUrl = process.env.ARATO_URL;
    const adminKey = process.env.ARATO_ADMIN_KEY;
    if (!aratoUrl || !adminKey) {
      this.logger.warn(`ARATO_URL ou ARATO_ADMIN_KEY não configurados — ${endpoint} não chamado.`);
      return;
    }
    try {
      await axios.post(`${aratoUrl}/api/admin/${endpoint}`, body, {
        headers: { 'x-admin-key': adminKey },
        timeout: 10000,
      });
    } catch (err: any) {
      this.logger.error(`Falha ao chamar Arato admin/${endpoint}: ${String(err?.message)}`);
      throw new BadRequestException(`Falha ao comunicar com o sistema Arato: ${String(err?.response?.data?.message ?? err?.message)}`);
    }
  }

  private async ensureCliente(empresaId: string, clienteId: string) {
    const c = await this.prisma.cliente.findFirst({ where: { id: clienteId, empresaId } });
    if (!c) throw new BadRequestException('Cliente não encontrado nesta empresa.');
    return c;
  }

  private async ensureProduto(empresaId: string, produtoServicoId: string) {
    const p = await this.prisma.produtoServico.findFirst({ where: { id: produtoServicoId, empresaId } });
    if (!p) throw new BadRequestException('Produto/serviço não encontrado nesta empresa.');
    return p;
  }
}
