import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertPerfilAcessoDto } from './dto/upsert-perfil-acesso.dto';

const recursosBase = [
  { chave: 'dashboard', nome: 'Dashboard', ordem: 1 },
  { chave: 'clientes', nome: 'Clientes', ordem: 2 },
  { chave: 'contratos', nome: 'Contratos', ordem: 3 },
  { chave: 'projetos', nome: 'Projetos', ordem: 4 },
  { chave: 'tarefas', nome: 'Tarefas', ordem: 5 },
  { chave: 'entregaveis', nome: 'Entregáveis', ordem: 6 },
  { chave: 'documentos', nome: 'Documentos', ordem: 7 },
  { chave: 'agenda', nome: 'Agenda', ordem: 8 },
  { chave: 'crm', nome: 'CRM', ordem: 9 },
  { chave: 'financeiro', nome: 'Financeiro', ordem: 10 },
  { chave: 'notificacoes', nome: 'Notificações', ordem: 11 },
  { chave: 'empresas', nome: 'Empresas', ordem: 12 },
  { chave: 'usuarios', nome: 'Usuários', ordem: 13 },
  { chave: 'perfis_acesso', nome: 'Perfis & Permissões', ordem: 14 },
  { chave: 'sistema', nome: 'Sistema & Suporte', ordem: 15 },
];

@Injectable()
export class PerfisAcessoService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureRecursosBase(tx?: PrismaClient | Prisma.TransactionClient) {
    const client = (tx ?? this.prisma) as PrismaClient | Prisma.TransactionClient;

    for (const recurso of recursosBase) {
      await client.recursoSistema.upsert({
        where: { chave: recurso.chave },
        update: {
          nome: recurso.nome,
          ordem: recurso.ordem,
          ativo: true,
        },
        create: {
          chave: recurso.chave,
          nome: recurso.nome,
          ordem: recurso.ordem,
          ativo: true,
        },
      });
    }
  }

  async ensurePerfisPadraoEmpresa(empresaId: string, tx?: PrismaClient | Prisma.TransactionClient) {
    const client = (tx ?? this.prisma) as PrismaClient | Prisma.TransactionClient;
    await this.ensureRecursosBase(client);

    const recursos = await client.recursoSistema.findMany({ orderBy: { ordem: 'asc' } });

    const perfisPadrao = [
      {
        nome: 'Administrador',
        descricao: 'Acesso amplo de administração do Raccolto.',
        padraoSistema: true,
        regra: () => ({
          visualizar: true,
          criar: true,
          editar: true,
          excluir: true,
          aprovar: true,
          administrar: true,
        }),
      },
      {
        nome: 'Analista',
        descricao: 'Acesso operacional padrão da equipe.',
        padraoSistema: true,
        regra: (chave: string) => ({
          visualizar: true,
          criar: ['clientes', 'contratos', 'projetos', 'tarefas', 'entregaveis', 'documentos'].includes(chave),
          editar: ['clientes', 'contratos', 'projetos', 'tarefas', 'entregaveis', 'documentos'].includes(chave),
          excluir: ['tarefas', 'entregaveis', 'documentos'].includes(chave),
          aprovar: ['entregaveis', 'documentos'].includes(chave),
          administrar: false,
        }),
      },
      {
        nome: 'Cliente',
        descricao: 'Acesso externo restrito ao que for visível ao cliente.',
        padraoSistema: true,
        regra: (chave: string) => ({
          visualizar: ['dashboard', 'projetos', 'tarefas', 'entregaveis', 'documentos', 'notificacoes'].includes(chave),
          criar: false,
          editar: false,
          excluir: false,
          aprovar: ['entregaveis', 'documentos'].includes(chave),
          administrar: false,
        }),
      },
    ];

    for (const perfilPadrao of perfisPadrao) {
      const perfil = await client.perfilAcesso.upsert({
        where: { empresaId_nome: { empresaId, nome: perfilPadrao.nome } },
        update: {
          descricao: perfilPadrao.descricao,
          ativo: true,
          padraoSistema: perfilPadrao.padraoSistema,
        },
        create: {
          empresaId,
          nome: perfilPadrao.nome,
          descricao: perfilPadrao.descricao,
          ativo: true,
          padraoSistema: perfilPadrao.padraoSistema,
        },
      });

      // Cria permissões apenas se ainda não existem — preserva customizações do usuário
      await (client as any).perfilPermissao.createMany({
        data: recursos.map((recurso) => ({
          perfilAcessoId: perfil.id,
          recursoSistemaId: recurso.id,
          ...perfilPadrao.regra(recurso.chave),
        })),
        skipDuplicates: true,
      });
    }
  }

  async findResources() {
    await this.ensureRecursosBase();
    return this.prisma.recursoSistema.findMany({ orderBy: { ordem: 'asc' } });
  }

  async findAll(empresaId: string) {
    await this.ensurePerfisPadraoEmpresa(empresaId);
    return this.prisma.perfilAcesso.findMany({
      where: { empresaId },
      include: {
        permissoes: {
          include: {
            recursoSistema: true,
          },
          orderBy: { recursoSistema: { ordem: 'asc' } },
        },
        _count: {
          select: { usuariosEmpresa: true },
        },
      },
      orderBy: [{ padraoSistema: 'desc' }, { nome: 'asc' }],
    });
  }

  async create(empresaId: string, dto: UpsertPerfilAcessoDto) {
    await this.ensureRecursosBase();
    const existente = await this.prisma.perfilAcesso.findFirst({ where: { empresaId, nome: dto.nome.trim() } });
    if (existente) throw new BadRequestException('Já existe um perfil com esse nome nesta empresa.');
    return this.persistPerfil(empresaId, null, dto);
  }

  async update(empresaId: string, perfilId: string, dto: UpsertPerfilAcessoDto) {
    const perfil = await this.prisma.perfilAcesso.findFirst({ where: { id: perfilId, empresaId } });
    if (!perfil) throw new BadRequestException('Perfil não encontrado nesta empresa.');
    return this.persistPerfil(empresaId, perfilId, dto);
  }

  private async persistPerfil(empresaId: string, perfilId: string | null, dto: UpsertPerfilAcessoDto) {
    const recursos = await this.prisma.recursoSistema.findMany();
    const recursoIds = new Set(recursos.map((r) => r.id));
    for (const permissao of dto.permissoes) {
      if (!recursoIds.has(permissao.recursoSistemaId)) {
        throw new BadRequestException('Há permissão apontando para recurso inexistente.');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const perfil = perfilId
        ? await tx.perfilAcesso.update({
            where: { id: perfilId },
            data: {
              nome: dto.nome.trim(),
              descricao: dto.descricao?.trim() || null,
              ativo: dto.ativo ?? true,
            },
          })
        : await tx.perfilAcesso.create({
            data: {
              empresaId,
              nome: dto.nome.trim(),
              descricao: dto.descricao?.trim() || null,
              ativo: dto.ativo ?? true,
            },
          });

      for (const permissao of dto.permissoes) {
        await tx.perfilPermissao.upsert({
          where: {
            perfilAcessoId_recursoSistemaId: {
              perfilAcessoId: perfil.id,
              recursoSistemaId: permissao.recursoSistemaId,
            },
          },
          update: {
            visualizar: permissao.visualizar ?? true,
            criar: permissao.criar ?? false,
            editar: permissao.editar ?? false,
            excluir: permissao.excluir ?? false,
            aprovar: permissao.aprovar ?? false,
            administrar: permissao.administrar ?? false,
          },
          create: {
            perfilAcessoId: perfil.id,
            recursoSistemaId: permissao.recursoSistemaId,
            visualizar: permissao.visualizar ?? true,
            criar: permissao.criar ?? false,
            editar: permissao.editar ?? false,
            excluir: permissao.excluir ?? false,
            aprovar: permissao.aprovar ?? false,
            administrar: permissao.administrar ?? false,
          },
        });
      }

      return tx.perfilAcesso.findUnique({
        where: { id: perfil.id },
        include: {
          permissoes: { include: { recursoSistema: true }, orderBy: { recursoSistema: { ordem: 'asc' } } },
          _count: { select: { usuariosEmpresa: true } },
        },
      });
    });
  }
}
