import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinanceiroService {
  constructor(private readonly prisma: PrismaService) {}

  async listRecebiveis(empresaId: string) {
    return this.prisma.recebivel.findMany({
      where: { empresaId },
      include: {
        cliente: true,
        contrato: true,
        produtoServico: true,
      },
      orderBy: [{ vencimento: 'asc' }, { createdAt: 'desc' }],
    });
  }
}
