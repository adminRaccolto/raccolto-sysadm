import { BadRequestException, Injectable } from '@nestjs/common';
import { PerfilUsuario, PrismaClient } from '@prisma/client';
import { PerfisAcessoService } from '../perfis-acesso/perfis-acesso.service';
import { PrismaService } from '../prisma/prisma.service';
import { ensurePlanoContasPadrao } from '../financeiro/plano-contas.seed';
import { ensureContratoModelosPadrao } from '../contratos/contrato-modelos.seed';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';

@Injectable()
export class EmpresasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly perfisAcessoService: PerfisAcessoService,
  ) {}

  async create(data: CreateEmpresaDto, currentUserId?: string) {
    const nome = data.nome.trim();
    const cnpj = data.cnpj?.trim() || null;

    if (cnpj) {
      const existente = await this.prisma.empresa.findFirst({ where: { cnpj } });
      if (existente) {
        throw new BadRequestException('Já existe uma empresa cadastrada com este CNPJ.');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const empresa = await tx.empresa.create({
        data: {
          nome,
          nomeFantasia: data.nomeFantasia?.trim() || null,
          cnpj,
          email: data.email?.trim().toLowerCase() || null,
          telefone: data.telefone?.trim() || null,
          logradouro: data.logradouro?.trim() || null,
          numero: data.numero?.trim() || null,
          complemento: data.complemento?.trim() || null,
          bairro: data.bairro?.trim() || null,
          cidade: data.cidade?.trim() || null,
          estado: data.estado?.trim() || null,
          cep: data.cep?.trim() || null,
          representanteNome: data.representanteNome?.trim() || null,
          representanteCargo: data.representanteCargo?.trim() || null,
          logoUrl: data.logoUrl?.trim() || null,
          infBancarias: data.infBancarias?.trim() || null,
        },
      });

      await this.perfisAcessoService.ensurePerfisPadraoEmpresa(empresa.id, tx as PrismaClient);

      if (currentUserId) {
        const perfilAdmin = await tx.perfilAcesso.findFirst({
          where: { empresaId: empresa.id, nome: 'Administrador' },
        });
        await tx.usuarioEmpresa.upsert({
          where: { usuarioId_empresaId: { usuarioId: currentUserId, empresaId: empresa.id } },
          update: { ativo: true, principal: false, perfilAcessoId: perfilAdmin?.id ?? null },
          create: {
            usuarioId: currentUserId,
            empresaId: empresa.id,
            ativo: true,
            principal: false,
            perfilAcessoId: perfilAdmin?.id ?? null,
          },
        });
      }

      await ensurePlanoContasPadrao(tx as any, empresa.id);
      await ensureContratoModelosPadrao(tx as any, empresa.id);

      return empresa;
    });
  }

  async findAllForUser(userId: string) {
    return this.prisma.empresa.findMany({
      where: { usuarioEmpresas: { some: { usuarioId: userId, ativo: true } } },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { usuarios: true, clientes: true, contratos: true, projetos: true } },
        usuarioEmpresas: {
          where: { usuarioId: userId, ativo: true },
          include: { perfilAcesso: true },
        },
      },
    });
  }

  async findCurrent(empresaId: string) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      include: { _count: { select: { usuarios: true, clientes: true, contratos: true, projetos: true } } },
    });
    if (!empresa) throw new BadRequestException('Empresa não encontrada.');
    return empresa;
  }

  async updateCurrentLogo(empresaId: string, logoUrl: string) {
    const atual = await this.prisma.empresa.findUnique({ where: { id: empresaId } });
    if (!atual) throw new BadRequestException('Empresa não encontrada.');
    return this.prisma.empresa.update({
      where: { id: empresaId },
      data: { logoUrl },
      include: { _count: { select: { usuarios: true, clientes: true, contratos: true, projetos: true } } },
    });
  }

  async updateCurrent(empresaId: string, data: UpdateEmpresaDto) {
    const atual = await this.prisma.empresa.findUnique({ where: { id: empresaId } });
    if (!atual) throw new BadRequestException('Empresa não encontrada.');

    const cnpj = data.cnpj !== undefined ? data.cnpj?.trim() || null : undefined;
    if (cnpj && cnpj !== atual.cnpj) {
      const existente = await this.prisma.empresa.findFirst({ where: { cnpj, id: { not: empresaId } } });
      if (existente) throw new BadRequestException('Já existe uma empresa cadastrada com este CNPJ.');
    }

    return this.prisma.empresa.update({
      where: { id: empresaId },
      data: {
        nome: data.nome?.trim() || undefined,
        nomeFantasia: data.nomeFantasia !== undefined ? data.nomeFantasia?.trim() || null : undefined,
        cnpj,
        email: data.email !== undefined ? data.email?.trim().toLowerCase() || null : undefined,
        telefone: data.telefone !== undefined ? data.telefone?.trim() || null : undefined,
        logradouro: data.logradouro !== undefined ? data.logradouro?.trim() || null : undefined,
        numero: data.numero !== undefined ? data.numero?.trim() || null : undefined,
        complemento: data.complemento !== undefined ? data.complemento?.trim() || null : undefined,
        bairro: data.bairro !== undefined ? data.bairro?.trim() || null : undefined,
        cidade: data.cidade !== undefined ? data.cidade?.trim() || null : undefined,
        estado: data.estado !== undefined ? data.estado?.trim() || null : undefined,
        cep: data.cep !== undefined ? data.cep?.trim() || null : undefined,
        representanteNome: data.representanteNome !== undefined ? data.representanteNome?.trim() || null : undefined,
        representanteCargo: data.representanteCargo !== undefined ? data.representanteCargo?.trim() || null : undefined,
        logoUrl: data.logoUrl !== undefined ? data.logoUrl?.trim() || null : undefined,
        infBancarias: data.infBancarias !== undefined ? data.infBancarias?.trim() || null : undefined,
        // Configuração da empresa
        regimeTributario: data.regimeTributario !== undefined ? data.regimeTributario?.trim() || null : undefined,
        inscricaoEstadual: data.inscricaoEstadual !== undefined ? data.inscricaoEstadual?.trim() || null : undefined,
        inscricaoMunicipal: data.inscricaoMunicipal !== undefined ? data.inscricaoMunicipal?.trim() || null : undefined,
        certificadoDigitalValidade: data.certificadoDigitalValidade !== undefined ? data.certificadoDigitalValidade?.trim() || null : undefined,
        certificadoDigitalStatus: data.certificadoDigitalStatus !== undefined ? data.certificadoDigitalStatus?.trim() || null : undefined,
        certificadoDigitalUrl: data.certificadoDigitalUrl !== undefined ? data.certificadoDigitalUrl?.trim() || null : undefined,
        certificadoDigitalSenha: data.certificadoDigitalSenha !== undefined ? data.certificadoDigitalSenha?.trim() || null : undefined,
        // Configuração fiscal
        issAliquota: data.issAliquota !== undefined ? data.issAliquota : undefined,
        itemListaServico: data.itemListaServico !== undefined ? data.itemListaServico?.trim() || null : undefined,
        codigoTributacaoMunicipio: data.codigoTributacaoMunicipio !== undefined ? data.codigoTributacaoMunicipio?.trim() || null : undefined,
        cnaeServico: data.cnaeServico !== undefined ? data.cnaeServico?.trim() || null : undefined,
        enotasEmpresaId: data.enotasEmpresaId !== undefined ? data.enotasEmpresaId?.trim() || null : undefined,
        enotasToken: data.enotasToken !== undefined ? data.enotasToken?.trim() || null : undefined,
        nfseAtivo: data.nfseAtivo !== undefined ? data.nfseAtivo : undefined,
        nfseAmbiente: data.nfseAmbiente !== undefined ? data.nfseAmbiente?.trim() || 'homologacao' : undefined,
      },
      include: { _count: { select: { usuarios: true, clientes: true, contratos: true, projetos: true } } },
    });
  }
}
