import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTipoGastoDto } from './dto/create-tipo-gasto.dto';

@Injectable()
export class TiposGastoReembolsoService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(empresaId: string) {
    return this.prisma.tipoGastoReembolso.findMany({
      where: { empresaId, ativo: true },
      orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
    });
  }

  async findAllIncludingInactive(empresaId: string) {
    return this.prisma.tipoGastoReembolso.findMany({
      where: { empresaId },
      orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
    });
  }

  async create(empresaId: string, data: CreateTipoGastoDto) {
    const nome = data.nome.trim();
    const existente = await this.prisma.tipoGastoReembolso.findUnique({
      where: { empresaId_nome: { empresaId, nome } },
    });
    if (existente) throw new BadRequestException(`Tipo de gasto "${nome}" já existe.`);

    const last = await this.prisma.tipoGastoReembolso.findFirst({
      where: { empresaId },
      orderBy: { ordem: 'desc' },
    });
    const ordem = data.ordem ?? (last ? last.ordem + 1 : 1);

    return this.prisma.tipoGastoReembolso.create({
      data: { empresaId, nome, ordem, ativo: data.ativo ?? true, padrao: false },
    });
  }

  async update(id: string, empresaId: string, data: Partial<CreateTipoGastoDto>) {
    const tipo = await this.prisma.tipoGastoReembolso.findUnique({ where: { id } });
    if (!tipo || tipo.empresaId !== empresaId) throw new BadRequestException('Tipo não encontrado.');

    if (data.nome) {
      const nome = data.nome.trim();
      const conflito = await this.prisma.tipoGastoReembolso.findFirst({
        where: { empresaId, nome, id: { not: id } },
      });
      if (conflito) throw new BadRequestException(`Tipo de gasto "${nome}" já existe.`);
    }

    return this.prisma.tipoGastoReembolso.update({
      where: { id },
      data: {
        nome: data.nome?.trim(),
        ordem: data.ordem,
        ativo: data.ativo,
      },
    });
  }

  async remove(id: string, empresaId: string) {
    const tipo = await this.prisma.tipoGastoReembolso.findUnique({ where: { id } });
    if (!tipo || tipo.empresaId !== empresaId) throw new BadRequestException('Tipo não encontrado.');
    if (tipo.padrao) throw new BadRequestException('Tipos padrão não podem ser excluídos.');
    return this.prisma.tipoGastoReembolso.delete({ where: { id } });
  }
}
