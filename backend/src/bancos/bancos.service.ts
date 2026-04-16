import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateBancoDto {
  codigo: string;
  nome: string;
  ativo?: boolean;
}

@Injectable()
export class BancosService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.banco.findMany({ orderBy: { codigo: 'asc' } });
  }

  async create(data: CreateBancoDto) {
    const exists = await this.prisma.banco.findUnique({ where: { codigo: data.codigo } });
    if (exists) throw new BadRequestException(`Banco com código ${data.codigo} já cadastrado.`);
    return this.prisma.banco.create({
      data: { codigo: data.codigo.trim(), nome: data.nome.trim(), ativo: data.ativo ?? true },
    });
  }

  async update(id: string, data: Partial<CreateBancoDto>) {
    const banco = await this.prisma.banco.findUnique({ where: { id } });
    if (!banco) throw new BadRequestException('Banco não encontrado.');
    return this.prisma.banco.update({
      where: { id },
      data: {
        codigo: data.codigo !== undefined ? data.codigo.trim() : undefined,
        nome: data.nome !== undefined ? data.nome.trim() : undefined,
        ativo: data.ativo !== undefined ? data.ativo : undefined,
      },
    });
  }

  async remove(id: string) {
    const banco = await this.prisma.banco.findUnique({
      where: { id },
      include: { _count: { select: { contas: true } } },
    });
    if (!banco) throw new BadRequestException('Banco não encontrado.');
    if ((banco as any)._count.contas > 0) throw new BadRequestException('Banco possui contas vinculadas e não pode ser excluído.');
    await this.prisma.banco.delete({ where: { id } });
    return { ok: true };
  }
}
