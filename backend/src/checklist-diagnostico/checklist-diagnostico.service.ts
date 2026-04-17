import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertChecklistDto } from './dto/upsert-checklist.dto';

@Injectable()
export class ChecklistDiagnosticoService {
  constructor(private readonly prisma: PrismaService) {}

  async findByCliente(empresaId: string, clienteId: string) {
    const cliente = await this.prisma.cliente.findFirst({ where: { id: clienteId, empresaId } });
    if (!cliente) throw new NotFoundException('Cliente não encontrado.');

    return this.prisma.checklistDiagnostico.findUnique({
      where: { clienteId },
      include: { fazendas: { orderBy: { ordem: 'asc' } } },
    });
  }

  async upsert(empresaId: string, clienteId: string, dto: UpsertChecklistDto) {
    const cliente = await this.prisma.cliente.findFirst({ where: { id: clienteId, empresaId } });
    if (!cliente) throw new NotFoundException('Cliente não encontrado.');

    const { fazendas, ...campos } = dto;

    return this.prisma.$transaction(async (tx) => {
      const checklist = await tx.checklistDiagnostico.upsert({
        where: { clienteId },
        update: { ...campos },
        create: { empresaId, clienteId, ...campos },
      });

      await tx.fazendaDiagnostico.deleteMany({ where: { checklistId: checklist.id } });

      if (fazendas.length > 0) {
        await tx.fazendaDiagnostico.createMany({
          data: fazendas.map((f, i) => ({
            checklistId: checklist.id,
            ordem: i,
            nomeFazenda: f.nomeFazenda,
            areaTotal: f.areaTotal ?? null,
            areaPlantio: f.areaPlantio ?? null,
            areaPlantioPropia: f.areaPlantioPropia ?? null,
            areaPlantioArrendada: f.areaPlantioArrendada ?? null,
            culturas: f.culturas,
            culturaOutro: f.culturaOutro ?? null,
            culturasAreas: f.culturasAreas,
            frustracaoSafra: f.frustracaoSafra,
            frustracoes: f.frustracoes,
          })),
        });
      }

      return tx.checklistDiagnostico.findUnique({
        where: { id: checklist.id },
        include: { fazendas: { orderBy: { ordem: 'asc' } } },
      });
    });
  }
}
