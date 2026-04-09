import { BadRequestException, Injectable } from '@nestjs/common';
import { TipoPessoa } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClienteDto } from './dto/create-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(empresaId: string, data: CreateClienteDto) {
    const cpfCnpj = this.normalizeDigits(data.cpfCnpj);

    if (cpfCnpj) {
      const existente = await this.prisma.cliente.findFirst({
        where: {
          empresaId,
          cpfCnpj,
        },
      });

      if (existente) {
        throw new BadRequestException('Já existe um cliente cadastrado com este CPF/CNPJ.');
      }
    }

    const tipoPessoa = data.tipoPessoa ?? this.detectTipoPessoa(cpfCnpj);

    return this.prisma.cliente.create({
      data: this.mapClienteData(empresaId, data, tipoPessoa, cpfCnpj),
      include: this.defaultInclude(),
    });
  }

  async update(empresaId: string, id: string, data: Partial<CreateClienteDto>) {
    const atual = await this.prisma.cliente.findFirst({ where: { id, empresaId } });

    if (!atual) {
      throw new BadRequestException('Cliente não encontrado.');
    }

    const cpfCnpj = this.normalizeDigits(data.cpfCnpj) ?? atual.cpfCnpj;
    if (cpfCnpj) {
      const existente = await this.prisma.cliente.findFirst({
        where: {
          empresaId,
          cpfCnpj,
          id: { not: id },
        },
      });

      if (existente) {
        throw new BadRequestException('Já existe outro cliente cadastrado com este CPF/CNPJ.');
      }
    }

    const tipoPessoa = data.tipoPessoa ?? atual.tipoPessoa ?? this.detectTipoPessoa(cpfCnpj);

    return this.prisma.cliente.update({
      where: { id },
      data: {
        tipoPessoa,
        razaoSocial: data.razaoSocial?.trim() ?? atual.razaoSocial,
        nomeFantasia: data.nomeFantasia !== undefined ? data.nomeFantasia?.trim() || null : undefined,
        cpfCnpj,
        inscricaoEstadual:
          data.inscricaoEstadual !== undefined ? data.inscricaoEstadual?.trim() || null : undefined,
        email: data.email !== undefined ? data.email?.trim().toLowerCase() || null : undefined,
        telefone: data.telefone !== undefined ? data.telefone?.trim() || null : undefined,
        whatsapp: data.whatsapp !== undefined ? data.whatsapp?.trim() || null : undefined,
        contatoPrincipal:
          data.contatoPrincipal !== undefined ? data.contatoPrincipal?.trim() || null : undefined,
        cep: data.cep !== undefined ? this.normalizeDigits(data.cep) : undefined,
        logradouro: data.logradouro !== undefined ? data.logradouro?.trim() || null : undefined,
        numero: data.numero !== undefined ? data.numero?.trim() || null : undefined,
        complemento: data.complemento !== undefined ? data.complemento?.trim() || null : undefined,
        bairro: data.bairro !== undefined ? data.bairro?.trim() || null : undefined,
        cidade: data.cidade !== undefined ? data.cidade?.trim() || null : undefined,
        estado: data.estado !== undefined ? data.estado?.trim().toUpperCase() || null : undefined,
        status: data.status ?? undefined,
      },
      include: this.defaultInclude(),
    });
  }

  async remove(empresaId: string, id: string) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id, empresaId },
      include: {
        _count: {
          select: {
            contratos: true,
            projetos: true,
            usuariosAcesso: true,
            recebiveis: true,
          },
        },
      },
    });

    if (!cliente) {
      throw new BadRequestException('Cliente não encontrado.');
    }

    if (
      cliente._count.contratos > 0 ||
      cliente._count.projetos > 0 ||
      cliente._count.usuariosAcesso > 0 ||
      cliente._count.recebiveis > 0
    ) {
      throw new BadRequestException(
        'Este cliente possui vínculos operacionais. Inative o cadastro em vez de excluir.',
      );
    }

    await this.prisma.cliente.delete({ where: { id } });

    return { message: 'Cliente excluído com sucesso.' };
  }

  async findAll(empresaId: string) {
    return this.prisma.cliente.findMany({
      where: { empresaId },
      include: this.defaultInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(empresaId: string, id: string) {
    const cliente = await this.prisma.cliente.findFirst({
      where: {
        id,
        empresaId,
      },
      include: {
        contratos: {
          orderBy: { createdAt: 'desc' },
        },
        usuariosAcesso: true,
      },
    });

    if (!cliente) {
      throw new BadRequestException('Cliente não encontrado.');
    }

    return cliente;
  }

  private defaultInclude() {
    return {
      _count: {
        select: {
          contratos: true,
          usuariosAcesso: true,
          projetos: true,
        },
      },
    };
  }

  private mapClienteData(
    empresaId: string,
    data: CreateClienteDto,
    tipoPessoa: TipoPessoa,
    cpfCnpj: string | null,
  ) {
    return {
      empresaId,
      tipoPessoa,
      razaoSocial: data.razaoSocial.trim(),
      nomeFantasia: data.nomeFantasia?.trim() || null,
      cpfCnpj,
      inscricaoEstadual: data.inscricaoEstadual?.trim() || null,
      email: data.email?.trim().toLowerCase() || null,
      telefone: data.telefone?.trim() || null,
      whatsapp: data.whatsapp?.trim() || null,
      contatoPrincipal: data.contatoPrincipal?.trim() || null,
      cep: this.normalizeDigits(data.cep),
      logradouro: data.logradouro?.trim() || null,
      numero: data.numero?.trim() || null,
      complemento: data.complemento?.trim() || null,
      bairro: data.bairro?.trim() || null,
      cidade: data.cidade?.trim() || null,
      estado: data.estado?.trim().toUpperCase() || null,
      status: data.status,
    };
  }

  private normalizeDigits(value?: string | null) {
    const onlyDigits = value?.replace(/\D/g, '') || '';
    return onlyDigits || null;
  }

  private detectTipoPessoa(cpfCnpj: string | null) {
    if (cpfCnpj?.length === 11) return TipoPessoa.PESSOA_FISICA;
    return TipoPessoa.PESSOA_JURIDICA;
  }
}
