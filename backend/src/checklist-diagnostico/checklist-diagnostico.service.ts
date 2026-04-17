import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertChecklistDto } from './dto/upsert-checklist.dto';

@Injectable()
export class ChecklistDiagnosticoService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveProjeto(empresaId: string, projetoId: string) {
    const projeto = await this.prisma.projeto.findFirst({
      where: { id: projetoId, empresaId },
      include: { cliente: true },
    });
    if (!projeto) throw new NotFoundException('Projeto não encontrado.');
    return projeto;
  }

  async findByProjeto(empresaId: string, projetoId: string) {
    await this.resolveProjeto(empresaId, projetoId);
    return this.prisma.checklistDiagnostico.findUnique({
      where: { projetoId },
      include: { fazendas: { orderBy: { ordem: 'asc' } }, cliente: true },
    });
  }

  async criarOuObter(empresaId: string, projetoId: string) {
    const projeto = await this.resolveProjeto(empresaId, projetoId);
    const existente = await this.prisma.checklistDiagnostico.findUnique({ where: { projetoId } });
    if (existente) return existente;
    return this.prisma.checklistDiagnostico.create({
      data: { empresaId, clienteId: projeto.clienteId, projetoId, status: 'PENDENTE' },
    });
  }

  async marcarEnviado(empresaId: string, projetoId: string) {
    await this.criarOuObter(empresaId, projetoId);
    return this.prisma.checklistDiagnostico.update({
      where: { projetoId },
      data: { status: 'AGUARDANDO_RESPOSTA' },
    });
  }

  async upsertInterno(empresaId: string, projetoId: string, dto: UpsertChecklistDto) {
    await this.criarOuObter(empresaId, projetoId);
    return this.persistChecklist(projetoId, dto);
  }

  async findByToken(token: string) {
    const checklist = await this.prisma.checklistDiagnostico.findUnique({
      where: { token },
      include: {
        cliente: true,
        fazendas: { orderBy: { ordem: 'asc' } },
      },
    });
    if (!checklist) throw new NotFoundException('Diagnóstico não encontrado.');
    return checklist;
  }

  async responderPublico(token: string, dto: UpsertChecklistDto) {
    const checklist = await this.prisma.checklistDiagnostico.findUnique({ where: { token } });
    if (!checklist) throw new NotFoundException('Diagnóstico não encontrado.');
    return this.persistChecklist(checklist.projetoId, dto, {
      status: 'RESPONDIDO',
      respondidoAt: new Date(),
    });
  }

  private async persistChecklist(
    projetoId: string,
    dto: UpsertChecklistDto,
    extraData: Record<string, any> = {},
  ) {
    const { fazendas, ...campos } = dto;
    return this.prisma.$transaction(async (tx) => {
      const checklist = await tx.checklistDiagnostico.update({
        where: { projetoId },
        data: { ...campos, ...extraData },
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
        include: { fazendas: { orderBy: { ordem: 'asc' } }, cliente: true },
      });
    });
  }
}
