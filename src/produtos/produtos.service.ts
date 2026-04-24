import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProdutoDto } from './dto/create-produto.dto';

@Injectable()
export class ProdutosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(empresaId: string, data: CreateProdutoDto) {
    const nome = data.nome.trim();

    const existente = await this.prisma.produtoServico.findFirst({
      where: { empresaId, nome },
    });

    if (existente) {
      throw new BadRequestException('Já existe um produto/serviço com este nome.');
    }

    return this.prisma.produtoServico.create({
      data: {
        empresaId,
        nome,
        descricao: data.descricao?.trim() || null,
        contaGerencialReceita: data.contaGerencialReceita?.trim() || null,
        ativo: data.ativo ?? true,
        ordem: data.ordem ?? 0,
      },
    });
  }

  async findAll(empresaId: string) {
    return this.prisma.produtoServico.findMany({
      where: { empresaId },
      orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
    });
  }
}
