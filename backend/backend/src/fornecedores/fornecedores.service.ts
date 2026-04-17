import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateFornecedorDto {
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  nomeContato?: string;
  telefoneEmpresa?: string;
  telefoneContato?: string;
  whatsapp?: string;
  email?: string;
  observacoes?: string;
  ativo?: boolean;
}

@Injectable()
export class FornecedoresService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(empresaId: string, apenasAtivos?: boolean) {
    return this.prisma.fornecedor.findMany({
      where: { empresaId, ...(apenasAtivos ? { ativo: true } : {}) },
      include: { _count: { select: { funcionarios: true } } },
      orderBy: { razaoSocial: 'asc' },
    });
  }

  async findOne(empresaId: string, id: string) {
    const f = await this.prisma.fornecedor.findFirst({
      where: { id, empresaId },
      include: { funcionarios: { select: { id: true, nome: true, cargo: true } } },
    });
    if (!f) throw new BadRequestException('Fornecedor não encontrado.');
    return f;
  }

  create(empresaId: string, data: CreateFornecedorDto) {
    return this.prisma.fornecedor.create({
      data: {
        empresaId,
        razaoSocial: data.razaoSocial.trim(),
        nomeFantasia: data.nomeFantasia?.trim() || null,
        cnpj: data.cnpj?.trim() || null,
        logradouro: data.logradouro?.trim() || null,
        numero: data.numero?.trim() || null,
        complemento: data.complemento?.trim() || null,
        bairro: data.bairro?.trim() || null,
        cidade: data.cidade?.trim() || null,
        estado: data.estado?.trim() || null,
        cep: data.cep?.trim() || null,
        nomeContato: data.nomeContato?.trim() || null,
        telefoneEmpresa: data.telefoneEmpresa?.trim() || null,
        telefoneContato: data.telefoneContato?.trim() || null,
        whatsapp: data.whatsapp?.trim() || null,
        email: data.email?.trim().toLowerCase() || null,
        observacoes: data.observacoes?.trim() || null,
        ativo: data.ativo ?? true,
      },
    });
  }

  async update(empresaId: string, id: string, data: Partial<CreateFornecedorDto>) {
    await this.findOne(empresaId, id);
    return this.prisma.fornecedor.update({
      where: { id },
      data: {
        ...(data.razaoSocial !== undefined ? { razaoSocial: data.razaoSocial.trim() } : {}),
        ...(data.nomeFantasia !== undefined ? { nomeFantasia: data.nomeFantasia?.trim() || null } : {}),
        ...(data.cnpj !== undefined ? { cnpj: data.cnpj?.trim() || null } : {}),
        ...(data.logradouro !== undefined ? { logradouro: data.logradouro?.trim() || null } : {}),
        ...(data.numero !== undefined ? { numero: data.numero?.trim() || null } : {}),
        ...(data.complemento !== undefined ? { complemento: data.complemento?.trim() || null } : {}),
        ...(data.bairro !== undefined ? { bairro: data.bairro?.trim() || null } : {}),
        ...(data.cidade !== undefined ? { cidade: data.cidade?.trim() || null } : {}),
        ...(data.estado !== undefined ? { estado: data.estado?.trim() || null } : {}),
        ...(data.cep !== undefined ? { cep: data.cep?.trim() || null } : {}),
        ...(data.nomeContato !== undefined ? { nomeContato: data.nomeContato?.trim() || null } : {}),
        ...(data.telefoneEmpresa !== undefined ? { telefoneEmpresa: data.telefoneEmpresa?.trim() || null } : {}),
        ...(data.telefoneContato !== undefined ? { telefoneContato: data.telefoneContato?.trim() || null } : {}),
        ...(data.whatsapp !== undefined ? { whatsapp: data.whatsapp?.trim() || null } : {}),
        ...(data.email !== undefined ? { email: data.email?.trim().toLowerCase() || null } : {}),
        ...(data.observacoes !== undefined ? { observacoes: data.observacoes?.trim() || null } : {}),
        ...(data.ativo !== undefined ? { ativo: data.ativo } : {}),
      },
    });
  }

  async remove(empresaId: string, id: string) {
    await this.findOne(empresaId, id);
    await this.prisma.fornecedor.delete({ where: { id } });
    return { ok: true };
  }
}
