import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCentroCustoDto } from './dto/create-centro-custo.dto';

@Injectable()
export class CentrosCustoService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(empresaId: string) {
    return this.prisma.centroCusto.findMany({
      where: { empresaId },
      include: {
        contaPai: { select: { id: true, codigo: true, descricao: true } },
        _count: { select: { subcentros: true, contasPagar: true, lancamentosTesouraria: true, recebiveis: true } },
      },
      orderBy: [{ codigo: 'asc' }],
    });
  }

  async create(empresaId: string, dto: CreateCentroCustoDto) {
    const existing = await this.prisma.centroCusto.findUnique({
      where: { empresaId_codigo: { empresaId, codigo: dto.codigo } },
    });
    if (existing) throw new BadRequestException('Já existe um centro de custo com esse código.');

    return this.prisma.centroCusto.create({
      data: {
        empresaId,
        codigo: dto.codigo,
        descricao: dto.descricao,
        contaPaiId: dto.contaPaiId ?? null,
        ativo: dto.ativo ?? true,
      },
    });
  }

  async update(empresaId: string, id: string, dto: CreateCentroCustoDto) {
    await this.findOne(empresaId, id);

    if (dto.codigo) {
      const conflict = await this.prisma.centroCusto.findFirst({
        where: { empresaId, codigo: dto.codigo, NOT: { id } },
      });
      if (conflict) throw new BadRequestException('Já existe um centro de custo com esse código.');
    }

    return this.prisma.centroCusto.update({
      where: { id },
      data: {
        codigo: dto.codigo,
        descricao: dto.descricao,
        contaPaiId: dto.contaPaiId ?? null,
        ativo: dto.ativo,
      },
    });
  }

  async remove(empresaId: string, id: string) {
    await this.findOne(empresaId, id);

    const uso = await this.prisma.centroCusto.findUnique({
      where: { id },
      include: {
        _count: { select: { subcentros: true, contasPagar: true, lancamentosTesouraria: true, recebiveis: true } },
      },
    });

    const total = (uso?._count.subcentros ?? 0) + (uso?._count.contasPagar ?? 0) +
                  (uso?._count.lancamentosTesouraria ?? 0) + (uso?._count.recebiveis ?? 0);
    if (total > 0) {
      throw new BadRequestException('Centro de custo possui lançamentos vinculados e não pode ser excluído.');
    }

    await this.prisma.centroCusto.delete({ where: { id } });
    return { ok: true };
  }

  private async findOne(empresaId: string, id: string) {
    const item = await this.prisma.centroCusto.findFirst({ where: { id, empresaId } });
    if (!item) throw new NotFoundException('Centro de custo não encontrado.');
    return item;
  }
}
