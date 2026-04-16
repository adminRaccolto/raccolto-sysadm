import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus() {
    const db = await this.prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok`;

    return {
      status: 'ok',
      system: 'Raccolto',
      database: db[0]?.ok === 1 ? 'connected' : 'unknown',
      timestamp: new Date().toISOString(),
    };
  }
}
