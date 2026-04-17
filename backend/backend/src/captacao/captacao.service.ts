import { Injectable, NotFoundException } from '@nestjs/common';
import { EtapaCrm } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFormularioDto } from './dto/create-formulario.dto';
import { SubmitFormularioDto } from './dto/submit-formulario.dto';

@Injectable()
export class CaptacaoService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Admin: CRUD de formulários ───────────────────────────────────────────

  async findAll(empresaId: string) {
    return this.prisma.formularioCaptacao.findMany({
      where: { empresaId },
      include: {
        produtoServico: { select: { id: true, nome: true } },
        _count: { select: { submissoes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(empresaId: string, id: string) {
    const form = await this.prisma.formularioCaptacao.findFirst({
      where: { id, empresaId },
      include: {
        produtoServico: { select: { id: true, nome: true } },
        submissoes: {
          include: { oportunidade: { select: { id: true, titulo: true, etapa: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!form) throw new NotFoundException('Formulário não encontrado');
    return form;
  }

  async create(empresaId: string, dto: CreateFormularioDto) {
    return this.prisma.formularioCaptacao.create({
      data: {
        empresaId,
        nome: dto.nome,
        slug: dto.slug,
        origemLead: dto.origemLead,
        titulo: dto.titulo,
        descricao: dto.descricao,
        produtoServicoId: dto.produtoServicoId ?? null,
        etapaInicial: dto.etapaInicial ?? EtapaCrm.LEAD_RECEBIDO,
        ativo: dto.ativo ?? true,
      },
    });
  }

  async update(empresaId: string, id: string, dto: Partial<CreateFormularioDto>) {
    await this.findOne(empresaId, id);
    return this.prisma.formularioCaptacao.update({
      where: { id },
      data: {
        ...(dto.nome !== undefined && { nome: dto.nome }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.origemLead !== undefined && { origemLead: dto.origemLead }),
        ...(dto.titulo !== undefined && { titulo: dto.titulo }),
        ...(dto.descricao !== undefined && { descricao: dto.descricao }),
        ...(dto.produtoServicoId !== undefined && { produtoServicoId: dto.produtoServicoId || null }),
        ...(dto.etapaInicial !== undefined && { etapaInicial: dto.etapaInicial }),
        ...(dto.ativo !== undefined && { ativo: dto.ativo }),
      },
    });
  }

  async remove(empresaId: string, id: string) {
    await this.findOne(empresaId, id);
    await this.prisma.formularioCaptacao.delete({ where: { id } });
    return { ok: true };
  }

  // ── Public: resolve formulário por slug ──────────────────────────────────

  async findBySlug(slug: string) {
    const form = await this.prisma.formularioCaptacao.findFirst({
      where: { slug, ativo: true },
      select: {
        id: true,
        nome: true,
        titulo: true,
        descricao: true,
        origemLead: true,
        empresaId: true,
        produtoServicoId: true,
        empresa: { select: { nomeFantasia: true, nome: true, logoUrl: true } },
      },
    });
    if (!form) throw new NotFoundException('Formulário não encontrado ou inativo');
    return form;
  }

  async submit(slug: string, dto: SubmitFormularioDto) {
    const form = await this.findBySlug(slug);

    // Cria oportunidade no CRM
    const titulo = dto.empresaNome
      ? `${dto.empresaNome} — ${dto.nomeContato}`
      : dto.nomeContato;

    const oportunidade = await this.prisma.oportunidadeCrm.create({
      data: {
        empresaId: form.empresaId,
        titulo,
        empresaNome: dto.empresaNome ?? dto.nomeContato,
        contatoNome: dto.nomeContato,
        email: dto.email ?? null,
        telefone: dto.telefone ?? null,
        origemLead: form.origemLead,
        produtoServicoId: form.produtoServicoId ?? null,
        etapa: (await this.prisma.formularioCaptacao.findUniqueOrThrow({ where: { empresaId_slug: { empresaId: form.empresaId, slug } }, select: { etapaInicial: true } })).etapaInicial,
        observacoes: dto.mensagem ?? null,
      },
    });

    // Registra a submissão
    const submissao = await this.prisma.formularioSubmissao.create({
      data: {
        formularioId: form.id,
        oportunidadeId: oportunidade.id,
        nomeContato: dto.nomeContato,
        empresaNome: dto.empresaNome ?? null,
        email: dto.email ?? null,
        telefone: dto.telefone ?? null,
        mensagem: dto.mensagem ?? null,
      },
    });

    return { ok: true, submissaoId: submissao.id, oportunidadeId: oportunidade.id };
  }
}
