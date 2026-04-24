import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';

@Injectable()
export class EmpresasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateEmpresaDto) {
    const nome = data.nome.trim();
    const cnpj = data.cnpj?.trim() || null;

    if (cnpj) {
      const existente = await this.prisma.empresa.findFirst({
        where: { cnpj },
      });

      if (existente) {
        throw new BadRequestException('Já existe uma empresa cadastrada com este CNPJ.');
      }
    }

    return this.prisma.empresa.create({
      data: {
        nome,
        nomeFantasia: data.nomeFantasia?.trim() || null,
        cnpj,
        email: data.email?.trim().toLowerCase() || null,
        telefone: data.telefone?.trim() || null,
      },
    });
  }

  async findAll() {
    return this.prisma.empresa.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            usuarios: true,
            clientes: true,
            contratos: true,
          },
        },
      },
    });
  }
}
