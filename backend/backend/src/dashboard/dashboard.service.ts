import { Injectable } from '@nestjs/common';
import {
  PerfilUsuario,
  StatusCliente,
  StatusContrato,
  StatusEntregavel,
  StatusFaturamento,
  StatusProjeto,
  StatusRecebivel,
  StatusTarefa,
} from '@prisma/client';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getResumo(user: AuthenticatedUser) {
    if (user.perfil === PerfilUsuario.CLIENTE && user.clienteId) {
      const [projetos, tarefasPendentes, entregaveisPendentes] = await Promise.all([
        this.prisma.projeto.findMany({
          where: {
            empresaId: user.empresaId,
            clienteId: user.clienteId,
            visivelCliente: true,
          },
          orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
          include: {
            _count: {
              select: {
                tarefas: true,
                entregaveis: true,
              },
            },
          },
        }),
        this.prisma.tarefa.count({
          where: {
            empresaId: user.empresaId,
            visivelCliente: true,
            projeto: {
              clienteId: user.clienteId,
            },
            status: {
              in: [
                StatusTarefa.NAO_INICIADA,
                StatusTarefa.EM_ANDAMENTO,
                StatusTarefa.AGUARDANDO,
              ],
            },
          },
        }),
        this.prisma.entregavel.count({
          where: {
            empresaId: user.empresaId,
            visivelCliente: true,
            projeto: {
              clienteId: user.clienteId,
            },
            status: {
              in: [
                StatusEntregavel.PLANEJADO,
                StatusEntregavel.EM_PRODUCAO,
                StatusEntregavel.EM_REVISAO,
                StatusEntregavel.AGUARDANDO_APROVACAO,
              ],
            },
          },
        }),
      ]);

      return {
        escopo: 'cliente',
        usuario: {
          nome: user.nome,
          email: user.email,
          perfil: user.perfil,
        },
        indicadores: {
          projetos: projetos.length,
          projetosAtivos: projetos.filter(
            (item) => item.status === StatusProjeto.EM_ANDAMENTO,
          ).length,
          tarefasPendentes,
          entregaveisPendentes,
        },
        projetos,
        atalhosSugeridos: [
          'Consultar projetos',
          'Ver entregáveis visíveis',
          'Acompanhar tarefas compartilhadas',
        ],
      };
    }

    const hoje = new Date();
    const em30dias = new Date();
    em30dias.setDate(hoje.getDate() + 30);

    const [
      totalClientes,
      totalClientesAtivos,
      totalContratos,
      contratosAtivos,
      contratosAVencer,
      totalUsuarios,
      totalProdutos,
      totalProjetos,
      projetosAtivos,
      projetosAguardandoCliente,
      tarefasEmAberto,
      tarefasEmAtraso,
      entregaveisPendentes,
      recebiveisEmAberto,
    ] = await Promise.all([
      this.prisma.cliente.count({ where: { empresaId: user.empresaId } }),
      this.prisma.cliente.count({ where: { empresaId: user.empresaId, status: StatusCliente.ATIVO } }),
      this.prisma.contrato.count({ where: { empresaId: user.empresaId } }),
      this.prisma.contrato.count({ where: { empresaId: user.empresaId, status: StatusContrato.ATIVO } }),
      this.prisma.contrato.count({
        where: {
          empresaId: user.empresaId,
          status: StatusContrato.ATIVO,
          dataFim: { gte: hoje, lte: em30dias },
        },
      }),
      this.prisma.usuario.count({ where: { empresaId: user.empresaId, ativo: true } }),
      this.prisma.produtoServico.count({ where: { empresaId: user.empresaId, ativo: true } }),
      this.prisma.projeto.count({ where: { empresaId: user.empresaId } }),
      this.prisma.projeto.count({ where: { empresaId: user.empresaId, status: StatusProjeto.EM_ANDAMENTO } }),
      this.prisma.projeto.count({ where: { empresaId: user.empresaId, status: StatusProjeto.AGUARDANDO_CLIENTE } }),
      this.prisma.tarefa.count({
        where: {
          empresaId: user.empresaId,
          status: { in: [StatusTarefa.NAO_INICIADA, StatusTarefa.EM_ANDAMENTO, StatusTarefa.AGUARDANDO] },
        },
      }),
      this.prisma.tarefa.count({
        where: {
          empresaId: user.empresaId,
          prazo: { lt: hoje },
          status: { in: [StatusTarefa.NAO_INICIADA, StatusTarefa.EM_ANDAMENTO, StatusTarefa.AGUARDANDO] },
        },
      }),
      this.prisma.entregavel.count({
        where: {
          empresaId: user.empresaId,
          status: { in: [StatusEntregavel.PLANEJADO, StatusEntregavel.EM_PRODUCAO, StatusEntregavel.EM_REVISAO, StatusEntregavel.AGUARDANDO_APROVACAO] },
        },
      }),
      this.prisma.recebivel.count({ where: { empresaId: user.empresaId, status: 'ABERTO' } }),
    ]);

    return {
      escopo: 'interno',
      usuario: {
        nome: user.nome,
        email: user.email,
        perfil: user.perfil,
      },
      indicadores: {
        totalClientes,
        totalClientesAtivos,
        totalContratos,
        contratosAtivos,
        contratosAVencer30Dias: contratosAVencer,
        usuariosAtivos: totalUsuarios,
        totalProdutos,
        totalProjetos,
        projetosAtivos,
        projetosAguardandoCliente,
        tarefasEmAberto,
        tarefasEmAtraso,
        entregaveisPendentes,
        recebiveisEmAberto,
      },
      atalhosSugeridos: [
        'Cadastrar cliente',
        'Cadastrar contrato',
        'Criar projeto',
        'Criar tarefa',
        'Cadastrar entregável',
        'Consultar saúde do sistema',
      ],
    };
  }

  async getBi(empresaId: string) {
    const hoje = new Date();
    const inicioMesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMesAtual = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);
    const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0, 23, 59, 59);
    const em30Dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);
    const em60Dias = new Date(hoje.getTime() + 60 * 24 * 60 * 60 * 1000);

    // ── Gera os últimos 6 meses para tendências ──────────────────────────────
    const meses6: { label: string; inicio: Date; fim: Date; comp: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      meses6.push({
        label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        comp: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        inicio: new Date(d.getFullYear(), d.getMonth(), 1),
        fim: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59),
      });
    }

    const [
      // Financeiro
      recebiveisAbertos,
      recebiveisVencidos,
      recebiveisRecebidosMes,
      recebiveisRecebidosMesAnterior,
      faturadoMes,
      faturadoMesAnterior,
      proximosVencimentos,
      // Contratos
      contratosAtivos,
      contratosAVencer30,
      contratosAVencer60,
      // Projetos
      projetosAtivos,
      projetosAguardando,
      projetosAtrasados,
      tarefasAtraso,
      entregaveisPendentes,
      // Clientes
      clientesAtivos,
      clientesNovos30,
      // Propostas
      propostasAbertas,
    ] = await Promise.all([
      // Recebíveis em aberto: soma total
      this.prisma.recebivel.aggregate({
        where: { empresaId, status: { in: [StatusRecebivel.ABERTO, StatusRecebivel.PARCIALMENTE_RECEBIDO] } },
        _sum: { valor: true },
        _count: true,
      }),
      // Recebíveis vencidos
      this.prisma.recebivel.aggregate({
        where: { empresaId, status: StatusRecebivel.ABERTO, vencimento: { lt: hoje } },
        _sum: { valor: true },
        _count: true,
      }),
      // Recebido mês atual
      this.prisma.recebivel.aggregate({
        where: { empresaId, status: StatusRecebivel.RECEBIDO, dataPagamento: { gte: inicioMesAtual, lte: fimMesAtual } },
        _sum: { valor: true },
      }),
      // Recebido mês anterior
      this.prisma.recebivel.aggregate({
        where: { empresaId, status: StatusRecebivel.RECEBIDO, dataPagamento: { gte: inicioMesAnterior, lte: fimMesAnterior } },
        _sum: { valor: true },
      }),
      // NFS-e emitidas mês atual
      this.prisma.faturamento.aggregate({
        where: { empresaId, status: StatusFaturamento.EMITIDO, competencia: `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}` },
        _sum: { valor: true },
        _count: true,
      }),
      // NFS-e emitidas mês anterior
      this.prisma.faturamento.aggregate({
        where: { empresaId, status: StatusFaturamento.EMITIDO, competencia: `${inicioMesAnterior.getFullYear()}-${String(inicioMesAnterior.getMonth() + 1).padStart(2, '0')}` },
        _sum: { valor: true },
      }),
      // Próximos 30 dias
      this.prisma.recebivel.findMany({
        where: { empresaId, status: StatusRecebivel.ABERTO, vencimento: { gte: hoje, lte: em30Dias } },
        include: { cliente: { select: { razaoSocial: true } } },
        orderBy: { vencimento: 'asc' },
        take: 10,
      }),
      this.prisma.contrato.count({ where: { empresaId, status: StatusContrato.ATIVO } }),
      this.prisma.contrato.count({ where: { empresaId, status: StatusContrato.ATIVO, dataFim: { gte: hoje, lte: em30Dias } } }),
      this.prisma.contrato.count({ where: { empresaId, status: StatusContrato.ATIVO, dataFim: { gte: hoje, lte: em60Dias } } }),
      this.prisma.projeto.count({ where: { empresaId, status: StatusProjeto.EM_ANDAMENTO } }),
      this.prisma.projeto.count({ where: { empresaId, status: StatusProjeto.AGUARDANDO_CLIENTE } }),
      this.prisma.projeto.count({ where: { empresaId, status: StatusProjeto.EM_ANDAMENTO, dataFimPrevista: { lt: hoje } } }),
      this.prisma.tarefa.count({ where: { empresaId, status: { in: [StatusTarefa.NAO_INICIADA, StatusTarefa.EM_ANDAMENTO] }, prazo: { lt: hoje } } }),
      this.prisma.entregavel.count({ where: { empresaId, status: { in: [StatusEntregavel.PLANEJADO, StatusEntregavel.EM_PRODUCAO, StatusEntregavel.EM_REVISAO, StatusEntregavel.AGUARDANDO_APROVACAO] } } }),
      this.prisma.cliente.count({ where: { empresaId, status: StatusCliente.ATIVO } }),
      this.prisma.cliente.count({ where: { empresaId, createdAt: { gte: new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000) } } }),
      this.prisma.proposta.count({ where: { empresaId, status: { in: ['RASCUNHO', 'AGUARDANDO_ASSINATURA'] as any } } }),
    ]);

    // Tendência de receita (6 meses)
    const tendenciaReceita = await Promise.all(
      meses6.map(async (m) => {
        const res = await this.prisma.recebivel.aggregate({
          where: { empresaId, status: StatusRecebivel.RECEBIDO, dataPagamento: { gte: m.inicio, lte: m.fim } },
          _sum: { valor: true },
        });
        const fat = await this.prisma.faturamento.aggregate({
          where: { empresaId, status: StatusFaturamento.EMITIDO, competencia: m.comp },
          _sum: { valor: true },
        });
        return {
          label: m.label,
          recebido: res._sum.valor ?? 0,
          faturado: fat._sum.valor ?? 0,
        };
      }),
    );

    // Top 5 clientes por valor de contrato ativo
    const topClientesRaw = await this.prisma.contrato.groupBy({
      by: ['clienteId', 'clienteRazaoSocial'],
      where: { empresaId, status: StatusContrato.ATIVO },
      _sum: { valor: true },
      orderBy: { _sum: { valor: 'desc' } },
      take: 5,
    });

    return {
      financeiro: {
        recebiveisEmAberto: { count: recebiveisAbertos._count, valor: recebiveisAbertos._sum.valor ?? 0 },
        recebiveisVencidos: { count: recebiveisVencidos._count, valor: recebiveisVencidos._sum.valor ?? 0 },
        recebidoMesAtual: recebiveisRecebidosMes._sum.valor ?? 0,
        recebidoMesAnterior: recebiveisRecebidosMesAnterior._sum.valor ?? 0,
        faturadoMesAtual: { count: faturadoMes._count, valor: faturadoMes._sum.valor ?? 0 },
        faturadoMesAnterior: faturadoMesAnterior._sum.valor ?? 0,
        proximosVencimentos,
      },
      contratos: { ativos: contratosAtivos, aVencer30: contratosAVencer30, aVencer60: contratosAVencer60 },
      projetos: { ativos: projetosAtivos, aguardandoCliente: projetosAguardando, atrasados: projetosAtrasados, tarefasAtraso, entregaveisPendentes },
      clientes: { ativos: clientesAtivos, novos30: clientesNovos30 },
      propostas: { abertas: propostasAbertas },
      tendenciaReceita,
      topClientes: topClientesRaw.map((c) => ({ nome: c.clienteRazaoSocial || 'Sem nome', valor: c._sum.valor ?? 0 })),
    };
  }
}
