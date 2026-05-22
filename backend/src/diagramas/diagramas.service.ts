import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDiagramaDto } from './dto/create-diagrama.dto';

@Injectable()
export class DiagramasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(empresaId: string, projetoId?: string) {
    return this.prisma.diagrama.findMany({
      where: { empresaId, ...(projetoId ? { projetoId } : {}) },
      select: {
        id: true, titulo: true, projetoId: true, createdAt: true, updatedAt: true,
        projeto: { select: { id: true, nome: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(empresaId: string, id: string) {
    const diagrama = await this.prisma.diagrama.findFirst({
      where: { id, empresaId },
      include: { projeto: { select: { id: true, nome: true } } },
    });
    if (!diagrama) throw new BadRequestException('Diagrama não encontrado.');
    return diagrama;
  }

  async create(empresaId: string, criadoPorId: string, data: CreateDiagramaDto) {
    return this.prisma.diagrama.create({
      data: {
        empresaId,
        criadoPorId,
        titulo: data.titulo.trim(),
        conteudo: data.conteudo ?? {},
        projetoId: data.projetoId || null,
      },
      include: { projeto: { select: { id: true, nome: true } } },
    });
  }

  async update(empresaId: string, id: string, data: CreateDiagramaDto) {
    await this.findOne(empresaId, id);
    return this.prisma.diagrama.update({
      where: { id },
      data: {
        titulo: data.titulo.trim(),
        conteudo: data.conteudo ?? {},
        ...(data.projetoId !== undefined ? { projetoId: data.projetoId || null } : {}),
      },
      include: { projeto: { select: { id: true, nome: true } } },
    });
  }

  async remove(empresaId: string, id: string) {
    await this.findOne(empresaId, id);
    await this.prisma.diagrama.delete({ where: { id } });
    return { message: 'Diagrama excluído com sucesso.' };
  }
}
