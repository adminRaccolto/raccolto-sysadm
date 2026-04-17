import { Injectable } from '@nestjs/common';
import { PerfilUsuario, PrioridadeNotificacao } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificacoesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(empresaId: string, usuarioId: string) {
    const [naoLidas, itens] = await Promise.all([
      this.prisma.notificacao.count({ where: { empresaId, usuarioId, lida: false } }),
      this.prisma.notificacao.findMany({
        where: { empresaId, usuarioId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ]);

    return { naoLidas, itens };
  }

  async marcarComoLida(empresaId: string, usuarioId: string, id: string) {
    await this.prisma.notificacao.updateMany({
      where: { id, empresaId, usuarioId },
      data: { lida: true },
    });
    return { message: 'Notificação marcada como lida.' };
  }

  async marcarTodasComoLidas(empresaId: string, usuarioId: string) {
    await this.prisma.notificacao.updateMany({
      where: { empresaId, usuarioId, lida: false },
      data: { lida: true },
    });
    return { message: 'Todas as notificações foram marcadas como lidas.' };
  }

  async notificarUsuarios(params: {
    empresaId: string;
    usuarioIds: string[];
    titulo: string;
    mensagem: string;
    link?: string | null;
    prioridade?: PrioridadeNotificacao;
  }) {
    const usuarioIds = [...new Set(params.usuarioIds.filter(Boolean))];
    if (usuarioIds.length === 0) return;

    await this.prisma.notificacao.createMany({
      data: usuarioIds.map((usuarioId) => ({
        empresaId: params.empresaId,
        usuarioId,
        titulo: params.titulo,
        mensagem: params.mensagem,
        link: params.link || null,
        prioridade: params.prioridade ?? PrioridadeNotificacao.MEDIA,
      })),
    });
  }

  async notificarAdmins(params: {
    empresaId: string;
    titulo: string;
    mensagem: string;
    link?: string | null;
    prioridade?: PrioridadeNotificacao;
  }) {
    const admins = await this.prisma.usuario.findMany({
      where: { empresaId: params.empresaId, perfil: PerfilUsuario.ADMIN, ativo: true },
      select: { id: true },
    });
    await this.notificarUsuarios({
      empresaId: params.empresaId,
      usuarioIds: admins.map((item) => item.id),
      titulo: params.titulo,
      mensagem: params.mensagem,
      link: params.link,
      prioridade: params.prioridade,
    });
  }
}
