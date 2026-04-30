import { Injectable, NotFoundException } from '@nestjs/common';
import { EtapaCrm } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDiagnosticoLeadDto } from './dto/create-diagnostico-lead.dto';

@Injectable()
export class DiagnosticoLeadService {
  constructor(private readonly prisma: PrismaService) {}

  async create(empresaId: string, dto: CreateDiagnosticoLeadDto) {
    const { culturas, operacoesTerceirizadas, produtividadeMedia, frustracaoSafra, ...rest } = dto;

    const lead = await this.prisma.diagnosticoLead.create({
      data: {
        empresaId,
        ...rest,
        culturas: culturas ?? [],
        operacoesTerceirizadas: operacoesTerceirizadas ?? [],
        produtividadeMedia: produtividadeMedia ?? undefined,
        frustracaoSafra: frustracaoSafra ?? undefined,
        status: 'PENDENTE',
        respondidoAt: new Date(),
      },
    });

    // 1ª Automação — cadastra no CRM como Lead Recebido
    await this.prisma.oportunidadeCrm.create({
      data: {
        empresaId,
        titulo: `Lead — ${dto.nome}`,
        empresaNome: dto.nome,
        contatoNome: dto.nome,
        email: dto.email,
        telefone: dto.telefone,
        origemLead: 'Hotsite Diagnóstico',
        etapa: EtapaCrm.LEAD_RECEBIDO,
        observacoes: `Diagnóstico preenchido via hotsite. Ref: ${lead.id}`,
      },
    });

    return lead;
  }

  async findAll(empresaId: string) {
    return this.prisma.diagnosticoLead.findMany({
      where: { empresaId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, nome: true, email: true, telefone: true,
        cidade: true, profissao: true, status: true, createdAt: true,
      },
    });
  }

  async findOne(empresaId: string, id: string) {
    const lead = await this.prisma.diagnosticoLead.findFirst({
      where: { id, empresaId },
    });
    if (!lead) throw new NotFoundException('Lead não encontrado.');
    return lead;
  }

  async updateStatus(empresaId: string, id: string, status: 'QUALIFICADO' | 'NAO_QUALIFICADO') {
    await this.findOne(empresaId, id);
    return this.prisma.diagnosticoLead.update({
      where: { id },
      data: { status },
    });
  }
}
