import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEtapaDto } from './dto/create-etapa.dto';

@Injectable()
export class EtapasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(empresaId: string, projetoId: string) {
    await this.validateProjeto(empresaId, projetoId);
    return this.prisma.projetoEtapa.findMany({
      where: { projetoId, empresaId },
      include: {
        _count: { select: { tarefas: true } },
        tarefas: {
          select: { id: true, status: true, estimativaHoras: true, horasRegistradas: true },
        },
      },
      orderBy: { ordem: 'asc' },
    });
  }

  async create(empresaId: string, projetoId: string, data: CreateEtapaDto) {
    await this.validateProjeto(empresaId, projetoId);
    const maxOrdem = await this.prisma.projetoEtapa.count({ where: { projetoId, empresaId } });
    return this.prisma.projetoEtapa.create({
      data: {
        empresaId,
        projetoId,
        nome: data.nome.trim(),
        meta: data.meta?.trim() || null,
        dataInicio: new Date(data.dataInicio),
        dataFim: new Date(data.dataFim),
        status: data.status ?? 'PLANEJADA',
        ordem: data.ordem ?? maxOrdem,
      },
    });
  }

  async update(empresaId: string, projetoId: string, etapaId: string, data: Partial<CreateEtapaDto>) {
    const etapa = await this.prisma.projetoEtapa.findFirst({ where: { id: etapaId, projetoId, empresaId } });
    if (!etapa) throw new BadRequestException('Etapa não encontrada.');
    return this.prisma.projetoEtapa.update({
      where: { id: etapaId },
      data: {
        nome: data.nome?.trim() ?? undefined,
        meta: data.meta !== undefined ? data.meta?.trim() || null : undefined,
        dataInicio: data.dataInicio ? new Date(data.dataInicio) : undefined,
        dataFim: data.dataFim ? new Date(data.dataFim) : undefined,
        status: data.status ?? undefined,
        ordem: data.ordem ?? undefined,
      },
    });
  }

  async remove(empresaId: string, projetoId: string, etapaId: string) {
    const etapa = await this.prisma.projetoEtapa.findFirst({
      where: { id: etapaId, projetoId, empresaId },
      include: { _count: { select: { tarefas: true } } },
    });
    if (!etapa) throw new BadRequestException('Etapa não encontrada.');
    if (etapa._count.tarefas > 0) {
      // Unlink tasks from this etapa before deleting
      await this.prisma.tarefa.updateMany({
        where: { etapaId, empresaId },
        data: { etapaId: null },
      });
    }
    await this.prisma.projetoEtapa.delete({ where: { id: etapaId } });
    return { message: 'Etapa removida.' };
  }

  async iniciar(empresaId: string, projetoId: string, etapaId: string) {
    return this.update(empresaId, projetoId, etapaId, { status: 'ATIVA' });
  }

  async concluir(empresaId: string, projetoId: string, etapaId: string) {
    return this.update(empresaId, projetoId, etapaId, { status: 'CONCLUIDA' });
  }

  private async validateProjeto(empresaId: string, projetoId: string) {
    const projeto = await this.prisma.projeto.findFirst({ where: { id: projetoId, empresaId } });
    if (!projeto) throw new BadRequestException('Projeto não encontrado.');
    return projeto;
  }
}
