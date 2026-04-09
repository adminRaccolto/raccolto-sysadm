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

  async update(empresaId: string, id: string, data: Partial<CreateProdutoDto>) {
    const atual = await this.prisma.produtoServico.findFirst({ where: { id, empresaId } });
    if (!atual) throw new BadRequestException('Produto/serviço não encontrado.');

    const nome = data.nome?.trim();
    if (nome && nome !== atual.nome) {
      const existente = await this.prisma.produtoServico.findFirst({
        where: { empresaId, nome, id: { not: id } },
      });
      if (existente) {
        throw new BadRequestException('Já existe um produto/serviço com este nome.');
      }
    }

    return this.prisma.produtoServico.update({
      where: { id },
      data: {
        nome: nome ?? undefined,
        descricao: data.descricao !== undefined ? data.descricao?.trim() || null : undefined,
        contaGerencialReceita:
          data.contaGerencialReceita !== undefined
            ? data.contaGerencialReceita?.trim() || null
            : undefined,
        ativo: data.ativo !== undefined ? data.ativo : undefined,
        ordem: data.ordem !== undefined ? data.ordem : undefined,
      },
    });
  }

  async remove(empresaId: string, id: string) {
    const produto = await this.prisma.produtoServico.findFirst({
      where: { id, empresaId },
      include: { _count: { select: { contratos: true, projetos: true, recebiveis: true } } },
    });
    if (!produto) throw new BadRequestException('Produto/serviço não encontrado.');
    if (produto._count.contratos > 0 || produto._count.projetos > 0 || produto._count.recebiveis > 0) {
      throw new BadRequestException('Este produto já possui vínculos operacionais. Inative em vez de excluir.');
    }
    await this.prisma.produtoServico.delete({ where: { id } });
    return { message: 'Produto/serviço excluído com sucesso.' };
  }

  async findAll(empresaId: string) {
    return this.prisma.produtoServico.findMany({
      where: { empresaId },
      orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
    });
  }
}
