import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PerfilUsuario, PrioridadeNotificacao, StatusDocumento, TipoDocumento } from '@prisma/client';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { CreateDocumentoDto } from './dto/create-documento.dto';

@Injectable()
export class DocumentosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoesService: NotificacoesService,
  ) {}

  async create(empresaId: string, data: CreateDocumentoDto) {
    await this.validateRelations(empresaId, data);

    const documento = await this.prisma.documento.create({
      data: this.mapDocumentoData(empresaId, data),
      include: this.defaultInclude(),
    });

    await this.notificarPosCriacao(empresaId, documento.id);
    return this.findOneByEmpresa(empresaId, documento.id);
  }

  async update(empresaId: string, id: string, data: Partial<CreateDocumentoDto>) {
    const atual = await this.prisma.documento.findFirst({ where: { id, empresaId } });
    if (!atual) throw new BadRequestException('Documento não encontrado.');
    await this.validateRelations(empresaId, data);

    await this.prisma.documento.update({
      where: { id },
      data: {
        projetoId: data.projetoId ?? undefined,
        contratoId: data.contratoId ?? undefined,
        tarefaId: data.tarefaId ?? undefined,
        entregavelId: data.entregavelId ?? undefined,
        nome: data.nome?.trim() ?? undefined,
        tipo: data.tipo ?? undefined,
        descricao: data.descricao !== undefined ? data.descricao?.trim() || null : undefined,
        arquivoUrl: data.arquivoUrl !== undefined ? data.arquivoUrl?.trim() || null : undefined,
        arquivoNomeOriginal: data.arquivoNomeOriginal !== undefined ? data.arquivoNomeOriginal?.trim() || null : undefined,
        arquivoMimeType: data.arquivoMimeType !== undefined ? data.arquivoMimeType?.trim() || null : undefined,
        arquivoTamanho: data.arquivoTamanho !== undefined ? data.arquivoTamanho : undefined,
        versao: data.versao !== undefined ? data.versao?.trim() || null : undefined,
        status: data.status ?? undefined,
        exigeAssinatura: data.exigeAssinatura !== undefined ? data.exigeAssinatura : undefined,
        exigeAprovacao: data.exigeAprovacao !== undefined ? data.exigeAprovacao : undefined,
        visivelCliente: data.visivelCliente !== undefined ? data.visivelCliente : undefined,
        dataEnvio: data.dataEnvio !== undefined ? (data.dataEnvio ? new Date(data.dataEnvio) : null) : undefined,
        dataConclusao:
          data.dataConclusao !== undefined ? (data.dataConclusao ? new Date(data.dataConclusao) : null) : undefined,
        observacaoInterna:
          data.observacaoInterna !== undefined ? data.observacaoInterna?.trim() || null : undefined,
        observacaoCliente:
          data.observacaoCliente !== undefined ? data.observacaoCliente?.trim() || null : undefined,
      },
      include: this.defaultInclude(),
    });

    await this.notificarPosCriacao(empresaId, id);
    return this.findOneByEmpresa(empresaId, id);
  }

  async remove(empresaId: string, id: string) {
    const atual = await this.prisma.documento.findFirst({ where: { id, empresaId } });
    if (!atual) throw new BadRequestException('Documento não encontrado.');
    await this.prisma.documento.delete({ where: { id } });
    return { message: 'Documento excluído com sucesso.' };
  }

  async findAll(user: AuthenticatedUser, filtros: { projetoId?: string; contratoId?: string; clienteId?: string; tipo?: string; semVinculo?: boolean }) {
    if (user.perfil === PerfilUsuario.CLIENTE && !user.clienteId) return [];

    return this.prisma.documento.findMany({
      where: {
        empresaId: user.empresaId,
        ...(filtros.projetoId ? { projetoId: filtros.projetoId } : {}),
        ...(filtros.contratoId ? { contratoId: filtros.contratoId } : {}),
        ...(filtros.clienteId ? { OR: [{ projeto: { clienteId: filtros.clienteId } }, { contrato: { clienteId: filtros.clienteId } }] } : {}),
        ...(filtros.tipo ? { tipo: filtros.tipo as TipoDocumento } : {}),
        ...(filtros.semVinculo ? { projetoId: null, contratoId: null, tarefaId: null, entregavelId: null } : {}),
        ...(user.perfil === PerfilUsuario.CLIENTE
          ? {
              visivelCliente: true,
              OR: [
                { projeto: { clienteId: user.clienteId! } },
                { contrato: { clienteId: user.clienteId! } },
              ],
            }
          : {}),
      },
      include: this.defaultInclude(),
      orderBy: [{ updatedAt: 'desc' }],
    });
  }

  async findOne(user: AuthenticatedUser, id: string) {
    if (user.perfil === PerfilUsuario.CLIENTE && !user.clienteId) {
      throw new ForbiddenException('Cliente sem vínculo operacional definido.');
    }

    const documento = await this.prisma.documento.findFirst({
      where: {
        id,
        empresaId: user.empresaId,
        ...(user.perfil === PerfilUsuario.CLIENTE
          ? {
              visivelCliente: true,
              OR: [
                { projeto: { clienteId: user.clienteId! } },
                { contrato: { clienteId: user.clienteId! } },
              ],
            }
          : {}),
      },
      include: this.defaultInclude(),
    });
    if (!documento) throw new BadRequestException('Documento não encontrado.');
    return documento;
  }

  async findOneByEmpresa(empresaId: string, id: string) {
    const documento = await this.prisma.documento.findFirst({
      where: { id, empresaId },
      include: this.defaultInclude(),
    });
    if (!documento) throw new BadRequestException('Documento não encontrado.');
    return documento;
  }

  private mapDocumentoData(empresaId: string, data: CreateDocumentoDto) {
    return {
      empresaId,
      projetoId: data.projetoId || null,
      contratoId: data.contratoId || null,
      tarefaId: data.tarefaId || null,
      entregavelId: data.entregavelId || null,
      nome: data.nome.trim(),
      tipo: data.tipo ?? TipoDocumento.OUTRO,
      descricao: data.descricao?.trim() || null,
      arquivoUrl: data.arquivoUrl?.trim() || null,
      arquivoNomeOriginal: data.arquivoNomeOriginal?.trim() || null,
      arquivoMimeType: data.arquivoMimeType?.trim() || null,
      arquivoTamanho: data.arquivoTamanho ?? null,
      versao: data.versao?.trim() || null,
      status: data.status ?? StatusDocumento.RASCUNHO,
      exigeAssinatura: data.exigeAssinatura ?? false,
      exigeAprovacao: data.exigeAprovacao ?? false,
      visivelCliente: data.visivelCliente ?? false,
      dataEnvio: data.dataEnvio ? new Date(data.dataEnvio) : null,
      dataConclusao: data.dataConclusao ? new Date(data.dataConclusao) : null,
      observacaoInterna: data.observacaoInterna?.trim() || null,
      observacaoCliente: data.observacaoCliente?.trim() || null,
    };
  }

  private async validateRelations(empresaId: string, data: Partial<CreateDocumentoDto>) {
    if (data.projetoId) {
      const projeto = await this.prisma.projeto.findFirst({ where: { id: data.projetoId, empresaId } });
      if (!projeto) throw new BadRequestException('Projeto não encontrado para este documento.');
    }
    if (data.contratoId) {
      const contrato = await this.prisma.contrato.findFirst({ where: { id: data.contratoId, empresaId } });
      if (!contrato) throw new BadRequestException('Contrato não encontrado para este documento.');
    }
    if (data.tarefaId) {
      const tarefa = await this.prisma.tarefa.findFirst({ where: { id: data.tarefaId, empresaId } });
      if (!tarefa) throw new BadRequestException('Tarefa não encontrada para este documento.');
    }
    if (data.entregavelId) {
      const entregavel = await this.prisma.entregavel.findFirst({ where: { id: data.entregavelId, empresaId } });
      if (!entregavel) throw new BadRequestException('Entregável não encontrado para este documento.');
    }
  }

  private async notificarPosCriacao(empresaId: string, documentoId: string) {
    const documento = await this.prisma.documento.findFirst({
      where: { id: documentoId, empresaId },
      include: {
        tarefa: { select: { id: true, titulo: true, responsavelUsuarioId: true } },
        projeto: { select: { id: true, nome: true, responsavelId: true } },
      },
    });
    if (!documento) return;

    if (documento.tipo === TipoDocumento.CONTRATO) {
      await this.notificacoesService.notificarAdmins({
        empresaId,
        titulo: 'Atualização de contrato',
        mensagem: `Documento contratual "${documento.nome}" foi salvo com status ${documento.status}.`,
        link: '/contratos',
        prioridade: PrioridadeNotificacao.ALTA,
      });
    }

    if (([StatusDocumento.APROVADO, StatusDocumento.ASSINADO] as StatusDocumento[]).includes(documento.status as StatusDocumento)) {
      const usuarioIds = [documento.tarefa?.responsavelUsuarioId, documento.projeto?.responsavelId].filter(Boolean) as string[];
      await this.notificacoesService.notificarUsuarios({
        empresaId,
        usuarioIds,
        titulo: 'Documento aprovado',
        mensagem: `O documento "${documento.nome}" foi marcado como ${documento.status.toLowerCase()}.`,
        link: documento.projetoId ? `/projetos/${documento.projetoId}` : '/projetos',
        prioridade: PrioridadeNotificacao.MEDIA,
      });
    }
  }

  private defaultInclude() {
    return {
      projeto: { select: { id: true, nome: true, clienteId: true } },
      contrato: { select: { id: true, titulo: true, clienteId: true } },
      tarefa: { select: { id: true, titulo: true } },
      entregavel: { select: { id: true, titulo: true } },
    };
  }
}
