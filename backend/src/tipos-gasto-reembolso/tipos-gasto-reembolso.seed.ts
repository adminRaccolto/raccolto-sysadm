import { PrismaClient } from '@prisma/client';

const TIPOS_PADRAO = [
  { nome: 'KM', ordem: 1 },
  { nome: 'Pedágio', ordem: 2 },
  { nome: 'Alimentação', ordem: 3 },
  { nome: 'Hospedagem', ordem: 4 },
  { nome: 'Outro', ordem: 5 },
];

export async function ensureTiposGastoPadrao(
  prisma: PrismaClient | Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
  empresaId: string,
) {
  for (const tipo of TIPOS_PADRAO) {
    await (prisma as any).tipoGastoReembolso.upsert({
      where: { empresaId_nome: { empresaId, nome: tipo.nome } },
      update: {},
      create: { empresaId, nome: tipo.nome, padrao: true, ativo: true, ordem: tipo.ordem },
    });
  }
}
