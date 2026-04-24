import { Injectable } from '@nestjs/common';
import {
  PerfilUsuario,
  StatusCliente,
  StatusContrato,
  StatusEntregavel,
  StatusProjeto,
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
}
