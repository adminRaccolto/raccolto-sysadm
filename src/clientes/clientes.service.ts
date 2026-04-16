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
      data: {
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
        nomeFazenda: data.nomeFazenda?.trim() || null,
        distanciaKm: data.distanciaKm ?? null,
        precoKmReembolso: data.precoKmReembolso ?? null,
      },
      include: {
        _count: {
          select: {
            contratos: true,
            usuariosAcesso: true,
          },
        },
      },
    });
  }

  async findAll(empresaId: string) {
    return this.prisma.cliente.findMany({
      where: { empresaId },
      include: {
        _count: {
          select: {
            contratos: true,
            usuariosAcesso: true,
          },
        },
      },
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

  async update(empresaId: string, id: string, data: CreateClienteDto) {
    await this.findOne(empresaId, id);
    const cpfCnpj = this.normalizeDigits(data.cpfCnpj);
    const tipoPessoa = data.tipoPessoa ?? this.detectTipoPessoa(cpfCnpj);
    return this.prisma.cliente.update({
      where: { id },
      data: {
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
        nomeFazenda: data.nomeFazenda?.trim() || null,
        distanciaKm: data.distanciaKm ?? null,
        precoKmReembolso: data.precoKmReembolso ?? null,
      },
      include: {
        _count: { select: { contratos: true, usuariosAcesso: true } },
      },
    });
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
