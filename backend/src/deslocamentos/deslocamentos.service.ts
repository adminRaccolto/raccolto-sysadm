import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateDeslocamentoDto {
  projetoId: string;
  clienteId: string;
  responsavelId?: string;
  data: string; // ISO date
  distanciaKm: number;
  precoKm: number;
  descricao?: string;
  observacoes?: string;
}

@Injectable()
export class DeslocamentosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(empresaId: string, projetoId?: string) {
    return this.prisma.deslocamento.findMany({
      where: { empresaId, ...(projetoId ? { projetoId } : {}) },
      include: {
        projeto: { select: { id: true, nome: true } },
        cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true, nomeFazenda: true } },
        responsavel: { select: { id: true, nome: true } },
      },
      orderBy: { data: 'desc' },
    });
  }

  async findOne(empresaId: string, id: string) {
    const d = await this.prisma.deslocamento.findFirst({
      where: { id, empresaId },
      include: {
        projeto: { select: { id: true, nome: true } },
        cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true, nomeFazenda: true } },
        responsavel: { select: { id: true, nome: true } },
      },
    });
    if (!d) throw new BadRequestException('Deslocamento não encontrado.');
    return d;
  }

  async create(empresaId: string, data: CreateDeslocamentoDto) {
    const projeto = await this.prisma.projeto.findFirst({ where: { id: data.projetoId, empresaId } });
    if (!projeto) throw new BadRequestException('Projeto não encontrado.');

    const valorTotal = Math.round(data.distanciaKm * data.precoKm * 100) / 100;

    return this.prisma.deslocamento.create({
      data: {
        empresaId,
        projetoId: data.projetoId,
        clienteId: data.clienteId,
        responsavelId: data.responsavelId ?? null,
        data: new Date(data.data),
        distanciaKm: data.distanciaKm,
        precoKm: data.precoKm,
        valorTotal,
        descricao: data.descricao ?? null,
        observacoes: data.observacoes ?? null,
      },
      include: {
        projeto: { select: { id: true, nome: true } },
        cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true, nomeFazenda: true } },
        responsavel: { select: { id: true, nome: true } },
      },
    });
  }

  async update(empresaId: string, id: string, data: Partial<CreateDeslocamentoDto> & { reembolsado?: boolean }) {
    await this.findOne(empresaId, id);

    const distancia = data.distanciaKm;
    const preco = data.precoKm;

    return this.prisma.deslocamento.update({
      where: { id },
      data: {
        ...(data.data !== undefined ? { data: new Date(data.data) } : {}),
        ...(distancia !== undefined ? { distanciaKm: distancia } : {}),
        ...(preco !== undefined ? { precoKm: preco } : {}),
        ...(distancia !== undefined && preco !== undefined ? { valorTotal: Math.round(distancia * preco * 100) / 100 } : {}),
        ...(data.descricao !== undefined ? { descricao: data.descricao } : {}),
        ...(data.observacoes !== undefined ? { observacoes: data.observacoes } : {}),
        ...(data.reembolsado !== undefined ? { reembolsado: data.reembolsado } : {}),
        ...(data.responsavelId !== undefined ? { responsavelId: data.responsavelId || null } : {}),
      },
      include: {
        projeto: { select: { id: true, nome: true } },
        cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true, nomeFazenda: true } },
        responsavel: { select: { id: true, nome: true } },
      },
    });
  }

  async remove(empresaId: string, id: string) {
    await this.findOne(empresaId, id);
    await this.prisma.deslocamento.delete({ where: { id } });
    return { ok: true };
  }

  async totalPorProjeto(empresaId: string, projetoId: string) {
    const agg = await this.prisma.deslocamento.aggregate({
      where: { empresaId, projetoId },
      _sum: { valorTotal: true, distanciaKm: true },
      _count: true,
    });
    return {
      count: agg._count,
      totalKm: agg._sum.distanciaKm ?? 0,
      totalValor: agg._sum.valorTotal ?? 0,
    };
  }
}
