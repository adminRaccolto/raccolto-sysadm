import { BadRequestException, Injectable } from '@nestjs/common';
import { TipoModeloDocumento } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface UpsertModeloDto {
  nome: string;
  tipo: TipoModeloDocumento;
  descricao?: string;
  conteudo: string;
  ativo?: boolean;
  padrao?: boolean;
}

@Injectable()
export class ModelosDocumentoService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(empresaId: string, tipo?: TipoModeloDocumento) {
    return this.prisma.modeloDocumento.findMany({
      where: { empresaId, ...(tipo ? { tipo } : {}) },
      orderBy: [{ tipo: 'asc' }, { padrao: 'desc' }, { nome: 'asc' }],
    });
  }

  async findOne(empresaId: string, id: string) {
    const modelo = await this.prisma.modeloDocumento.findFirst({ where: { id, empresaId } });
    if (!modelo) throw new BadRequestException('Modelo não encontrado.');
    return modelo;
  }

  async create(empresaId: string, data: UpsertModeloDto) {
    const nome = data.nome.trim();
    const existente = await this.prisma.modeloDocumento.findFirst({ where: { empresaId, tipo: data.tipo, nome } });
    if (existente) throw new BadRequestException('Já existe um modelo com este nome para este tipo.');

    return this.prisma.$transaction(async (tx) => {
      if (data.padrao) {
        await tx.modeloDocumento.updateMany({ where: { empresaId, tipo: data.tipo, padrao: true }, data: { padrao: false } });
      }
      return tx.modeloDocumento.create({
        data: {
          empresaId,
          tipo: data.tipo,
          nome,
          descricao: data.descricao?.trim() || null,
          conteudo: data.conteudo,
          ativo: data.ativo ?? true,
          padrao: data.padrao ?? false,
        },
      });
    });
  }

  async update(empresaId: string, id: string, data: Partial<UpsertModeloDto>) {
    const atual = await this.findOne(empresaId, id);
    const nome = data.nome !== undefined ? data.nome.trim() : undefined;
    if (nome && nome !== atual.nome) {
      const existente = await this.prisma.modeloDocumento.findFirst({ where: { empresaId, tipo: atual.tipo, nome, id: { not: id } } });
      if (existente) throw new BadRequestException('Já existe um modelo com este nome para este tipo.');
    }

    return this.prisma.$transaction(async (tx) => {
      if (data.padrao) {
        await tx.modeloDocumento.updateMany({ where: { empresaId, tipo: atual.tipo, padrao: true, id: { not: id } }, data: { padrao: false } });
      }
      return tx.modeloDocumento.update({
        where: { id },
        data: {
          ...(nome !== undefined ? { nome } : {}),
          ...(data.descricao !== undefined ? { descricao: data.descricao?.trim() || null } : {}),
          ...(data.conteudo !== undefined ? { conteudo: data.conteudo } : {}),
          ...(data.ativo !== undefined ? { ativo: data.ativo } : {}),
          ...(data.padrao !== undefined ? { padrao: data.padrao } : {}),
        },
      });
    });
  }

  async remove(empresaId: string, id: string) {
    await this.findOne(empresaId, id);
    await this.prisma.modeloDocumento.delete({ where: { id } });
    return { message: 'Modelo excluído com sucesso.' };
  }

  // Usado internamente pelos serviços de contrato e proposta
  async findPadrao(empresaId: string, tipo: TipoModeloDocumento, nome?: string | null) {
    return this.prisma.modeloDocumento.findFirst({
      where: {
        empresaId,
        tipo,
        ativo: true,
        ...(nome ? { nome } : { padrao: true }),
      },
    });
  }

  // Seed automático na primeira vez
  async ensureModelosPadrao(empresaId: string) {
    const existente = await this.prisma.modeloDocumento.count({ where: { empresaId, tipo: 'CONTRATO' } });
    if (existente > 0) return;

    await this.prisma.modeloDocumento.create({
      data: {
        empresaId,
        tipo: 'CONTRATO',
        nome: 'Contrato padrão',
        descricao: 'Modelo base de prestação de serviços com preenchimento automático.',
        padrao: true,
        ativo: true,
        conteudo: `INSTRUMENTO PARTICULAR DE CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE CONSULTORIA

CONTRATADA: {{contratada_nome_razao_social}}, inscrita no CPF/CNPJ sob o nº {{contratada_documento}}, com sede em {{contratada_endereco_completo}}, neste ato representada por {{contratada_representante_nome}}, na qualidade de {{contratada_representante_cargo}}.

CONTRATANTE: {{contratante_nome_razao_social}}, inscrito no CPF/CNPJ sob o nº {{contratante_documento}}, residente ou sediado em {{contratante_endereco_completo}}.

CLÁUSULA PRIMEIRA – DO OBJETO
1.1. O objeto deste contrato é a prestação de serviços de consultoria empresarial pela CONTRATADA, visando a {{objeto_contrato}} da CONTRATANTE.

CLÁUSULA SEGUNDA – DAS CONDIÇÕES DE EXECUÇÃO E PRAZOS
2.1. Os serviços terão duração estimada de {{duracao_contrato}}, com início em {{data_inicio_contrato}} e término previsto para {{data_fim_contrato}}.

CLÁUSULA TERCEIRA – DOS HONORÁRIOS
3.1. Pelos serviços, a CONTRATANTE pagará o valor global de {{valor_global_contrato}}, conforme cronograma:

{{grade_parcelamento_contrato}}

CLÁUSULA QUARTA – DOS REEMBOLSOS
4.1. Despesas de deslocamento, hospedagem e alimentação correrão por conta da CONTRATANTE.

CLÁUSULA QUINTA – DO FORO
5.1. Fica eleito o Foro da Comarca de {{localidade_assinatura}} para dirimir quaisquer controvérsias.

{{localidade_assinatura}}, {{dia_assinatura}} de {{mes_assinatura}} de {{ano_assinatura}}.`,
      },
    });
  }
}
