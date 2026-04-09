import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Prisma,
  StatusContaPagar,
  StatusRecebivel,
  TipoContaBancaria,
  TipoContaGerencial,
  TipoLancamentoTesouraria,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContaBancariaDto } from './dto/create-conta-bancaria.dto';
import { CreateContaGerencialDto } from './dto/create-conta-gerencial.dto';
import { CreateContaPagarDto } from './dto/create-conta-pagar.dto';
import { CreateLancamentoTesourariaDto } from './dto/create-lancamento-tesouraria.dto';
import { CreateRecebivelDto } from './dto/create-recebivel.dto';
import { ensurePlanoContasPadrao } from './plano-contas.seed';

const DEFAULT_PAGE_SIZE = 100;

@Injectable()
export class FinanceiroService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(empresaId: string) {
    const hoje = new Date();
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

    const [totalReceberAberto, totalPagarAberto, vencidosReceber, vencidosPagar] = await Promise.all([
      this.prisma.recebivel.aggregate({
        where: { empresaId, status: { notIn: ['RECEBIDO', 'CANCELADO'] } },
        _sum: { valor: true },
      }),
      this.prisma.contaPagar.aggregate({
        where: { empresaId, status: { notIn: ['PAGO', 'CANCELADO'] } },
        _sum: { valor: true },
      }),
      this.prisma.recebivel.count({
        where: { empresaId, status: { notIn: ['RECEBIDO', 'CANCELADO'] }, vencimento: { lt: inicioHoje } },
      }),
      this.prisma.contaPagar.count({
        where: { empresaId, status: { notIn: ['PAGO', 'CANCELADO'] }, vencimento: { lt: inicioHoje } },
      }),
    ]);

    const somaReceber = totalReceberAberto._sum.valor ?? 0;
    const somaPagar = totalPagarAberto._sum.valor ?? 0;
    const fluxo = await this.getFluxoCaixaProjetado(empresaId);

    return {
      indicadores: {
        totalReceberAberto: somaReceber,
        totalPagarAberto: somaPagar,
        saldoProjetado: somaReceber - somaPagar,
        vencidosReceber,
        vencidosPagar,
      },
      fluxo,
    };
  }

  async listRecebiveis(empresaId: string, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
    const skip = (page - 1) * pageSize;
    const [itens, total] = await Promise.all([
      this.prisma.recebivel.findMany({
        where: { empresaId },
        include: {
          cliente: true,
          contrato: { select: { id: true, titulo: true, codigo: true } },
          produtoServico: { select: { id: true, nome: true } },
          contaGerencial: { select: { id: true, codigo: true, descricao: true } },
        },
        orderBy: [{ vencimento: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      this.prisma.recebivel.count({ where: { empresaId } }),
    ]);
    return { itens, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async createRecebivel(empresaId: string, data: CreateRecebivelDto) {
    await this.ensureCliente(empresaId, data.clienteId);
    await this.ensureContaGerencial(empresaId, data.contaGerencialId, TipoContaGerencial.RECEITA);
    if (data.produtoServicoId) await this.ensureProduto(empresaId, data.produtoServicoId);
    if (data.contratoId) await this.ensureContrato(empresaId, data.contratoId);

    return this.prisma.recebivel.create({
      data: {
        empresaId,
        clienteId: data.clienteId,
        contratoId: data.contratoId || null,
        produtoServicoId: data.produtoServicoId || null,
        contaGerencialId: data.contaGerencialId,
        descricao: data.descricao.trim(),
        parcelaNumero: data.parcelaNumero ?? null,
        totalParcelas: data.totalParcelas ?? null,
        valor: data.valor,
        vencimento: new Date(data.vencimento),
        origemAutomatica: false,
      },
      include: { cliente: true, contrato: true, produtoServico: true, contaGerencial: true },
    });
  }

  async updateRecebivel(empresaId: string, id: string, data: Partial<CreateRecebivelDto>) {
    const atual = await this.prisma.recebivel.findFirst({ where: { id, empresaId } });
    if (!atual) throw new BadRequestException('Conta a receber não encontrada.');
    if (atual.origemAutomatica) throw new BadRequestException('Recebível automático deve ser ajustado no contrato de origem.');
    if (data.clienteId) await this.ensureCliente(empresaId, data.clienteId);
    if (data.contaGerencialId) await this.ensureContaGerencial(empresaId, data.contaGerencialId, TipoContaGerencial.RECEITA);
    if (data.produtoServicoId) await this.ensureProduto(empresaId, data.produtoServicoId);
    if (data.contratoId) await this.ensureContrato(empresaId, data.contratoId);
    return this.prisma.recebivel.update({
      where: { id },
      data: {
        clienteId: data.clienteId ?? undefined,
        contratoId: data.contratoId !== undefined ? data.contratoId || null : undefined,
        produtoServicoId: data.produtoServicoId !== undefined ? data.produtoServicoId || null : undefined,
        contaGerencialId: data.contaGerencialId ?? undefined,
        descricao: data.descricao !== undefined ? data.descricao.trim() : undefined,
        parcelaNumero: data.parcelaNumero !== undefined ? data.parcelaNumero ?? null : undefined,
        totalParcelas: data.totalParcelas !== undefined ? data.totalParcelas ?? null : undefined,
        valor: data.valor ?? undefined,
        vencimento: data.vencimento ? new Date(data.vencimento) : undefined,
      },
      include: { cliente: true, contrato: true, produtoServico: true, contaGerencial: true },
    });
  }

  async removeRecebivel(empresaId: string, id: string) {
    const atual = await this.prisma.recebivel.findFirst({ where: { id, empresaId } });
    if (!atual) throw new BadRequestException('Conta a receber não encontrada.');
    if (atual.origemAutomatica) throw new BadRequestException('Recebível automático deve ser removido no contrato de origem.');
    await this.prisma.recebivel.delete({ where: { id } });
    return { message: 'Conta a receber excluída com sucesso.' };
  }

  async listContasPagar(empresaId: string, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
    const skip = (page - 1) * pageSize;
    const [itens, total] = await Promise.all([
      this.prisma.contaPagar.findMany({
        where: { empresaId },
        include: { contaGerencial: { select: { id: true, codigo: true, descricao: true } } },
        orderBy: [{ vencimento: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      this.prisma.contaPagar.count({ where: { empresaId } }),
    ]);
    return { itens, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async createContaPagar(empresaId: string, data: CreateContaPagarDto) {
    await this.ensureContaGerencial(empresaId, data.contaGerencialId);
    const competencia = this.resolveCompetencia(data);
    const baseVencimento = new Date(data.vencimento);
    const dataCompra = data.dataCompra ? new Date(data.dataCompra) : null;
    const fornecedor = data.fornecedor?.trim() || null;
    const descricao = data.descricao.trim();
    const observacoes = data.observacoes?.trim() || null;
    const anexoUrl = data.anexoUrl?.trim() || null;

    if (data.parcelado && (data.totalParcelas ?? 0) > 1) {
      const totalParcelas = data.totalParcelas!;
      const grupo = `PARC-${Date.now()}-${Math.round(Math.random() * 100000)}`;
      const valorParcela = Number((data.valor / totalParcelas).toFixed(2));
      const registros: Prisma.ContaPagarCreateManyInput[] = Array.from({ length: totalParcelas }).map((_, index) => {
        const vencimento = new Date(baseVencimento);
        vencimento.setMonth(vencimento.getMonth() + index);
        return { empresaId, contaGerencialId: data.contaGerencialId, fornecedor, descricao, competencia, dataCompra, vencimento, valor: valorParcela, valorTotalCompra: data.valor, parcelado: true, grupoParcelamento: grupo, parcelaNumero: index + 1, totalParcelas, recorrente: false, anexoUrl, observacoes };
      });
      await this.prisma.contaPagar.createMany({ data: registros });
      return this.prisma.contaPagar.findMany({ where: { empresaId, grupoParcelamento: grupo }, include: { contaGerencial: true }, orderBy: { parcelaNumero: 'asc' } });
    }

    if (data.recorrente && (data.quantidadeRecorrencias ?? 0) > 1) {
      const quantidade = data.quantidadeRecorrencias!;
      const grupo = `REC-${Date.now()}-${Math.round(Math.random() * 100000)}`;
      const registros: Prisma.ContaPagarCreateManyInput[] = Array.from({ length: quantidade }).map((_, index) => {
        const vencimento = new Date(baseVencimento);
        vencimento.setMonth(vencimento.getMonth() + index);
        const competenciaRec = new Date(vencimento.getFullYear(), vencimento.getMonth(), 1);
        return { empresaId, contaGerencialId: data.contaGerencialId, fornecedor, descricao, competencia: competenciaRec, dataCompra, vencimento, valor: data.valor, valorTotalCompra: data.valor, parcelado: false, grupoParcelamento: grupo, parcelaNumero: index + 1, totalParcelas: quantidade, recorrente: true, anexoUrl, observacoes };
      });
      await this.prisma.contaPagar.createMany({ data: registros });
      return this.prisma.contaPagar.findMany({ where: { empresaId, grupoParcelamento: grupo }, include: { contaGerencial: true }, orderBy: { parcelaNumero: 'asc' } });
    }

    return this.prisma.contaPagar.create({ data: { empresaId, contaGerencialId: data.contaGerencialId, fornecedor, descricao, competencia, dataCompra, vencimento: baseVencimento, valor: data.valor, valorTotalCompra: data.valor, parcelado: false, recorrente: false, anexoUrl, observacoes }, include: { contaGerencial: true } });
  }

  async updateContaPagar(empresaId: string, id: string, data: Partial<CreateContaPagarDto>) {
    const atual = await this.prisma.contaPagar.findFirst({ where: { id, empresaId } });
    if (!atual) throw new BadRequestException('Conta a pagar não encontrada.');
    if (atual.grupoParcelamento) throw new BadRequestException('Edite compras parceladas/recorrentes pelo grupo em versão futura.');
    if (data.contaGerencialId) await this.ensureContaGerencial(empresaId, data.contaGerencialId);
    return this.prisma.contaPagar.update({ where: { id }, data: { contaGerencialId: data.contaGerencialId ?? undefined, fornecedor: data.fornecedor !== undefined ? data.fornecedor?.trim() || null : undefined, descricao: data.descricao !== undefined ? data.descricao.trim() : undefined, competencia: data.competencia ? this.firstDayOfMonth(new Date(data.competencia)) : undefined, dataCompra: data.dataCompra !== undefined ? (data.dataCompra ? new Date(data.dataCompra) : null) : undefined, vencimento: data.vencimento ? new Date(data.vencimento) : undefined, valor: data.valor ?? undefined, valorTotalCompra: data.valor !== undefined ? data.valor : undefined, anexoUrl: data.anexoUrl !== undefined ? data.anexoUrl?.trim() || null : undefined, observacoes: data.observacoes !== undefined ? data.observacoes?.trim() || null : undefined }, include: { contaGerencial: true } });
  }

  async setAnexoContaPagar(empresaId: string, id: string, anexoUrl: string) {
    const atual = await this.prisma.contaPagar.findFirst({ where: { id, empresaId } });
    if (!atual) throw new BadRequestException('Conta a pagar não encontrada.');
    return this.prisma.contaPagar.update({ where: { id }, data: { anexoUrl }, include: { contaGerencial: true } });
  }

  async removeContaPagar(empresaId: string, id: string) {
    const atual = await this.prisma.contaPagar.findFirst({ where: { id, empresaId } });
    if (!atual) throw new BadRequestException('Conta a pagar não encontrada.');
    await this.prisma.contaPagar.delete({ where: { id } });
    return { message: 'Conta a pagar excluída com sucesso.' };
  }

  async listLancamentosTesouraria(empresaId: string, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
    const skip = (page - 1) * pageSize;
    const [itens, total] = await Promise.all([
      this.prisma.lancamentoTesouraria.findMany({
        where: { empresaId },
        include: { contaBancaria: { select: { id: true, nome: true, banco: true } }, contaGerencial: { select: { id: true, codigo: true, descricao: true } } },
        orderBy: [{ dataLancamento: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      this.prisma.lancamentoTesouraria.count({ where: { empresaId } }),
    ]);
    return { itens, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async createLancamentoTesouraria(empresaId: string, data: CreateLancamentoTesourariaDto) {
    const contaBancaria = await this.ensureContaBancaria(empresaId, data.contaBancariaId);
    await this.ensureContaGerencial(empresaId, data.contaGerencialId);
    const delta = this.resolveDeltaSaldo(data.tipo, data.valor);
    return this.prisma.$transaction(async (tx) => {
      const lancamento = await tx.lancamentoTesouraria.create({ data: { empresaId, contaBancariaId: data.contaBancariaId, contaGerencialId: data.contaGerencialId, tipo: data.tipo, descricao: data.descricao.trim(), dataLancamento: new Date(data.dataLancamento), valor: data.valor, observacoes: data.observacoes?.trim() || null }, include: { contaBancaria: true, contaGerencial: true } });
      await tx.contaBancaria.update({ where: { id: contaBancaria.id }, data: { saldoAtual: contaBancaria.saldoAtual + delta } });
      return lancamento;
    });
  }

  async removeLancamentoTesouraria(empresaId: string, id: string) {
    const atual = await this.prisma.lancamentoTesouraria.findFirst({ where: { id, empresaId }, include: { contaBancaria: true } });
    if (!atual) throw new BadRequestException('Lançamento de tesouraria não encontrado.');
    const delta = this.resolveDeltaSaldo(atual.tipo, atual.valor);
    await this.prisma.$transaction([
      this.prisma.lancamentoTesouraria.delete({ where: { id } }),
      this.prisma.contaBancaria.update({ where: { id: atual.contaBancariaId }, data: { saldoAtual: atual.contaBancaria.saldoAtual - delta } }),
    ]);
    return { message: 'Lançamento de tesouraria excluído com sucesso.' };
  }

  async listContasGerenciais(empresaId: string) {
    const existente = await this.prisma.contaGerencial.count({ where: { empresaId } });
    if (existente === 0) await this.seedPlanoContas(empresaId);
    return this.prisma.contaGerencial.findMany({ where: { empresaId }, include: { contaPai: true, _count: { select: { subcontas: true, contasPagar: true, recebiveis: true, lancamentos: true } } }, orderBy: [{ codigo: 'asc' }] });
  }

  async createContaGerencial(empresaId: string, data: CreateContaGerencialDto) {
    if (data.contaPaiId) await this.ensureContaGerencial(empresaId, data.contaPaiId);
    return this.prisma.contaGerencial.create({ data: { empresaId, contaPaiId: data.contaPaiId || null, codigo: data.codigo.trim(), descricao: data.descricao.trim(), tipo: data.tipo, aceitaLancamento: data.aceitaLancamento ?? true, ativo: data.ativo ?? true }, include: { contaPai: true } });
  }

  async updateContaGerencial(empresaId: string, id: string, data: Partial<CreateContaGerencialDto>) {
    const atual = await this.prisma.contaGerencial.findFirst({ where: { id, empresaId } });
    if (!atual) throw new BadRequestException('Conta gerencial não encontrada.');
    if (data.contaPaiId) await this.ensureContaGerencial(empresaId, data.contaPaiId);
    return this.prisma.contaGerencial.update({ where: { id }, data: { contaPaiId: data.contaPaiId !== undefined ? data.contaPaiId || null : undefined, codigo: data.codigo !== undefined ? data.codigo.trim() : undefined, descricao: data.descricao !== undefined ? data.descricao.trim() : undefined, tipo: data.tipo ?? undefined, aceitaLancamento: data.aceitaLancamento ?? undefined, ativo: data.ativo ?? undefined }, include: { contaPai: true } });
  }

  async removeContaGerencial(empresaId: string, id: string) {
    const conta = await this.prisma.contaGerencial.findFirst({ where: { id, empresaId }, include: { _count: { select: { subcontas: true, contasPagar: true, recebiveis: true, lancamentos: true } } } });
    if (!conta) throw new BadRequestException('Conta gerencial não encontrada.');
    if (conta._count.subcontas || conta._count.contasPagar || conta._count.recebiveis || conta._count.lancamentos) throw new BadRequestException('A conta gerencial possui vínculos e não pode ser excluída.');
    await this.prisma.contaGerencial.delete({ where: { id } });
    return { message: 'Conta gerencial excluída com sucesso.' };
  }

  async seedPlanoContas(empresaId: string) {
    await ensurePlanoContasPadrao(this.prisma, empresaId);
    return this.listContasGerenciais(empresaId);
  }

  async listContasBancarias(empresaId: string) {
    return this.prisma.contaBancaria.findMany({ where: { empresaId }, orderBy: { nome: 'asc' } });
  }

  async createContaBancaria(empresaId: string, data: CreateContaBancariaDto) {
    const saldoInicial = data.saldoInicial ?? 0;
    return this.prisma.contaBancaria.create({ data: { empresaId, nome: data.nome.trim(), banco: data.banco?.trim() || null, agencia: data.agencia?.trim() || null, numeroConta: data.numeroConta?.trim() || null, tipo: data.tipo ?? TipoContaBancaria.CORRENTE, saldoInicial, saldoAtual: saldoInicial, ativo: data.ativo ?? true } });
  }

  async updateContaBancaria(empresaId: string, id: string, data: Partial<CreateContaBancariaDto>) {
    const atual = await this.prisma.contaBancaria.findFirst({ where: { id, empresaId } });
    if (!atual) throw new BadRequestException('Conta bancária não encontrada.');
    const saldoInicial = data.saldoInicial ?? atual.saldoInicial;
    const diferenca = saldoInicial - atual.saldoInicial;
    return this.prisma.contaBancaria.update({ where: { id }, data: { nome: data.nome !== undefined ? data.nome.trim() : undefined, banco: data.banco !== undefined ? data.banco?.trim() || null : undefined, agencia: data.agencia !== undefined ? data.agencia?.trim() || null : undefined, numeroConta: data.numeroConta !== undefined ? data.numeroConta?.trim() || null : undefined, tipo: data.tipo ?? undefined, saldoInicial: data.saldoInicial ?? undefined, saldoAtual: data.saldoInicial !== undefined ? atual.saldoAtual + diferenca : undefined, ativo: data.ativo ?? undefined } });
  }

  async removeContaBancaria(empresaId: string, id: string) {
    const conta = await this.prisma.contaBancaria.findFirst({ where: { id, empresaId }, include: { _count: { select: { lancamentos: true } } } });
    if (!conta) throw new BadRequestException('Conta bancária não encontrada.');
    if (conta._count.lancamentos > 0) throw new BadRequestException('A conta bancária possui lançamentos e não pode ser excluída.');
    await this.prisma.contaBancaria.delete({ where: { id } });
    return { message: 'Conta bancária excluída com sucesso.' };
  }

  async getFluxoCaixaProjetado(empresaId: string) {
    const [recebiveis, contasPagar] = await Promise.all([
      this.prisma.recebivel.findMany({ where: { empresaId, status: { in: [StatusRecebivel.ABERTO, StatusRecebivel.VENCIDO] } }, select: { vencimento: true, valor: true } }),
      this.prisma.contaPagar.findMany({ where: { empresaId, status: { in: [StatusContaPagar.ABERTO, StatusContaPagar.VENCIDO] } }, select: { vencimento: true, valor: true } }),
    ]);
    const mapa = new Map<string, { data: string; entradas: number; saidas: number; saldo: number }>();
    const push = (date: Date, entradas: number, saidas: number) => {
      const chave = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString().slice(0, 10);
      const item = mapa.get(chave) ?? { data: chave, entradas: 0, saidas: 0, saldo: 0 };
      item.entradas += entradas;
      item.saidas += saidas;
      item.saldo = item.entradas - item.saidas;
      mapa.set(chave, item);
    };
    recebiveis.forEach((item) => push(item.vencimento, item.valor, 0));
    contasPagar.forEach((item) => push(item.vencimento, 0, item.valor));
    return Array.from(mapa.values()).sort((a, b) => a.data.localeCompare(b.data));
  }

  private resolveCompetencia(data: CreateContaPagarDto) {
    if (data.competencia) return this.firstDayOfMonth(new Date(data.competencia));
    if (data.dataCompra) return this.firstDayOfMonth(new Date(data.dataCompra));
    return this.firstDayOfMonth(new Date(data.vencimento));
  }

  private firstDayOfMonth(date: Date) { return new Date(date.getFullYear(), date.getMonth(), 1); }

  private resolveDeltaSaldo(tipo: TipoLancamentoTesouraria, valor: number) {
    if (tipo === TipoLancamentoTesouraria.ENTRADA) return valor;
    if (tipo === TipoLancamentoTesouraria.AJUSTE) return valor;
    return -Math.abs(valor);
  }

  private async ensureContaGerencial(empresaId: string, id: string, tipoEsperado?: TipoContaGerencial) {
    const conta = await this.prisma.contaGerencial.findFirst({ where: { id, empresaId, ativo: true } });
    if (!conta) throw new BadRequestException('Conta gerencial não encontrada.');
    if (!conta.aceitaLancamento) throw new BadRequestException('Selecione uma conta gerencial analítica, apta para lançamentos.');
    if (tipoEsperado && conta.tipo !== tipoEsperado) throw new BadRequestException('Conta gerencial incompatível com este tipo de lançamento.');
    return conta;
  }

  private async ensureContaBancaria(empresaId: string, id: string) {
    const conta = await this.prisma.contaBancaria.findFirst({ where: { id, empresaId } });
    if (!conta) throw new BadRequestException('Conta bancária não encontrada.');
    return conta;
  }

  private async ensureCliente(empresaId: string, id: string) {
    const cliente = await this.prisma.cliente.findFirst({ where: { id, empresaId } });
    if (!cliente) throw new BadRequestException('Cliente não encontrado nesta empresa.');
    return cliente;
  }

  private async ensureProduto(empresaId: string, id: string) {
    const item = await this.prisma.produtoServico.findFirst({ where: { id, empresaId } });
    if (!item) throw new BadRequestException('Produto/serviço não encontrado nesta empresa.');
    return item;
  }

  private async ensureContrato(empresaId: string, id: string) {
    const item = await this.prisma.contrato.findFirst({ where: { id, empresaId } });
    if (!item) throw new BadRequestException('Contrato não encontrado nesta empresa.');
    return item;
  }
}
