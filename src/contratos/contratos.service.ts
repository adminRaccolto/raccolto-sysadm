import { BadRequestException, Injectable } from '@nestjs/common';
import { StatusAssinatura } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContratoDto } from './dto/create-contrato.dto';

@Injectable()
export class ContratosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(empresaId: string, data: CreateContratoDto) {
    const cliente = await this.prisma.cliente.findFirst({
      where: {
        id: data.clienteId,
        empresaId,
      },
    });

    if (!cliente) {
      throw new BadRequestException('Cliente não encontrado nesta empresa.');
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

    const codigo = data.codigo?.trim() || null;

    if (codigo) {
      const contratoExistente = await this.prisma.contrato.findFirst({
        where: { codigo },
      });

      if (contratoExistente) {
        throw new BadRequestException('Já existe contrato com este código.');
      }
    }

    const contrato = await this.prisma.contrato.create({
      data: {
        empresaId,
        clienteId: data.clienteId,
        produtoServicoId,
        numeroContrato: data.numeroContrato?.trim() || null,
        codigo,
        titulo: data.titulo.trim(),
        objeto: data.objeto?.trim() || null,
        tipoContrato: data.tipoContrato?.trim() || null,
        responsavelInterno: data.responsavelInterno?.trim() || null,
        contatoClienteNome: data.contatoClienteNome?.trim() || null,
        contatoClienteEmail: data.contatoClienteEmail?.trim().toLowerCase() || null,
        valor: data.valor,
        moeda: data.moeda?.trim().toUpperCase() || 'BRL',
        formaPagamento: data.formaPagamento?.trim() || null,
        periodicidadeCobranca: data.periodicidadeCobranca?.trim() || null,
        quantidadeParcelas: data.quantidadeParcelas,
        valorParcela: data.valorParcela,
        dataInicio: new Date(data.dataInicio),
        dataFim: data.dataFim ? new Date(data.dataFim) : null,
        primeiroVencimento: data.primeiroVencimento ? new Date(data.primeiroVencimento) : null,
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
      },
      include: this.defaultInclude(),
    });

    if (
      contrato.gerarFinanceiroAutomatico &&
      contrato.statusAssinatura === StatusAssinatura.ASSINADO
    ) {
      await this.gerarRecebiveisAutomaticos({
        empresaId,
        clienteId: contrato.clienteId,
        contratoId: contrato.id,
        produtoServicoId: contrato.produtoServicoId,
        titulo: contrato.titulo,
        valor: contrato.valor,
        quantidadeParcelas: contrato.quantidadeParcelas,
        valorParcela: contrato.valorParcela,
        primeiroVencimento: contrato.primeiroVencimento,
      });
    }

    return this.findOne(empresaId, contrato.id);
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
      where: {
        id,
        empresaId,
      },
      include: {
        ...this.defaultInclude(),
        recebiveis: {
          orderBy: { vencimento: 'asc' },
        },
      },
    });

    if (!contrato) {
      throw new BadRequestException('Contrato não encontrado.');
    }

    return contrato;
  }

  private async gerarRecebiveisAutomaticos(input: {
    empresaId: string;
    clienteId: string;
    contratoId: string;
    produtoServicoId: string | null;
    titulo: string;
    valor: number | null;
    quantidadeParcelas: number | null;
    valorParcela: number | null;
    primeiroVencimento: Date | null;
  }) {
    const total = input.valor ?? 0;
    const parcelas = input.quantidadeParcelas && input.quantidadeParcelas > 0 ? input.quantidadeParcelas : 1;
    const primeiroVencimento = input.primeiroVencimento ?? new Date();
    const valorBase = input.valorParcela ?? Number((total / parcelas).toFixed(2));

    const existentes = await this.prisma.recebivel.count({
      where: { contratoId: input.contratoId },
    });

    if (existentes > 0) return;

    const data = Array.from({ length: parcelas }).map((_, index) => {
      const vencimento = new Date(primeiroVencimento);
      vencimento.setMonth(vencimento.getMonth() + index);
      return {
        empresaId: input.empresaId,
        clienteId: input.clienteId,
        contratoId: input.contratoId,
        produtoServicoId: input.produtoServicoId,
        descricao: `${input.titulo} - parcela ${index + 1}/${parcelas}`,
        parcelaNumero: index + 1,
        totalParcelas: parcelas,
        valor: valorBase,
        vencimento,
        origemAutomatica: true,
      };
    });

    await this.prisma.recebivel.createMany({ data });
  }

  private defaultInclude() {
    return {
      cliente: true,
      produtoServico: true,
    };
  }
}
