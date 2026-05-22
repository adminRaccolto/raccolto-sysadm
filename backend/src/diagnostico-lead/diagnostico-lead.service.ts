import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EtapaCrm } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateDiagnosticoLeadDto } from './dto/create-diagnostico-lead.dto';
import { SolicitarCodigoLeadDto } from './dto/solicitar-codigo-lead.dto';
import { ValidarCodigoLeadDto } from './dto/validar-codigo-lead.dto';
import { calcularDiagnostico } from './scoring.util';

function gerarCodigo(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

@Injectable()
export class DiagnosticoLeadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async solicitarCodigo(empresaId: string, dto: SolicitarCodigoLeadDto) {
    // Remove códigos anteriores do mesmo e-mail para essa empresa
    await this.prisma.codigoValidacaoLead.deleteMany({
      where: { email: dto.email, empresaId },
    });

    const codigo = gerarCodigo();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await this.prisma.codigoValidacaoLead.create({
      data: { empresaId, codigo, expiresAt, ...dto },
    });

    // 1ª Automação — cadastra no CRM como Lead Recebido ao preencher os dados iniciais
    // Só cria se ainda não existir entrada para este e-mail nessa empresa
    const jaNoCrm = await this.prisma.oportunidadeCrm.findFirst({
      where: { empresaId, email: dto.email },
      select: { id: true },
    });

    if (!jaNoCrm) {
      await this.prisma.crmEtapa.upsert({
        where: { empresaId_chave: { empresaId, chave: 'LEAD_RECEBIDO' } },
        update: {},
        create: { empresaId, chave: 'LEAD_RECEBIDO', nome: 'Lead Recebido', cor: '#6b7280', ordem: 0 },
      });

      await this.prisma.oportunidadeCrm.create({
        data: {
          empresaId,
          titulo: `Lead — ${dto.nome}`,
          empresaNome: dto.nome,
          contatoNome: dto.nome,
          email: dto.email,
          telefone: dto.telefone,
          origemLead: 'Hotsite Diagnóstico',
          etapa: EtapaCrm.LEAD_RECEBIDO,
          observacoes: `Lead cadastrado ao preencher os dados no hotsite de diagnóstico.`,
        },
      });
    }

    // Fire-and-forget — não bloqueia a resposta enquanto o SMTP processa
    void this.mail.enviarCodigoValidacao({
      to: dto.email,
      toNome: dto.nome.split(' ')[0],
      codigo,
    });

    return { ok: true };
  }

  async validarCodigo(empresaId: string, dto: ValidarCodigoLeadDto) {
    const registro = await this.prisma.codigoValidacaoLead.findFirst({
      where: { email: dto.email, empresaId, validado: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!registro) {
      throw new BadRequestException('Nenhuma solicitação de código encontrada para este e-mail.');
    }

    if (new Date() > registro.expiresAt) {
      throw new BadRequestException('Código expirado. Solicite um novo código.');
    }

    if (registro.codigo !== dto.codigo) {
      throw new BadRequestException('Código inválido.');
    }

    const sessionToken = randomUUID();

    await this.prisma.codigoValidacaoLead.update({
      where: { id: registro.id },
      data: { validado: true, sessionToken },
    });

    return { sessionToken };
  }

  async create(empresaId: string, dto: CreateDiagnosticoLeadDto) {
    const { sessionToken, culturas, operacoesTerceirizadas, produtividadeMedia, frustracaoSafra, ...rest } = dto;

    const validacao = await this.prisma.codigoValidacaoLead.findFirst({
      where: { sessionToken, validado: true, empresaId },
    });

    if (!validacao) {
      throw new BadRequestException('Sessão inválida. Valide o e-mail novamente.');
    }

    const lead = await this.prisma.diagnosticoLead.create({
      data: {
        empresaId,
        ...rest,
        culturas: culturas ?? [],
        operacoesTerceirizadas: operacoesTerceirizadas ?? [],
        produtividadeMedia: produtividadeMedia ?? undefined,
        frustracaoSafra: frustracaoSafra ?? undefined,
        status: 'PENDENTE',
        respondidoAt: new Date(),
      },
    });

    await this.prisma.codigoValidacaoLead.delete({ where: { id: validacao.id } });

    // Garante que a etapa DIAGNOSTICO existe no CRM da empresa
    await this.prisma.crmEtapa.upsert({
      where: { empresaId_chave: { empresaId, chave: 'DIAGNOSTICO' } },
      update: {},
      create: { empresaId, chave: 'DIAGNOSTICO', nome: 'Diagnóstico', cor: '#8b5cf6', ordem: 2 },
    });

    // 2ª Automação — atualiza CRM para Diagnóstico com 50% de probabilidade
    await this.prisma.oportunidadeCrm.updateMany({
      where: { empresaId, email: rest.email, etapa: EtapaCrm.LEAD_RECEBIDO },
      data: { etapa: EtapaCrm.DIAGNOSTICO, probabilidade: 50 },
    });

    // 3ª Automação — envia link do diagnóstico por e-mail ao lead (fire-and-forget)
    const score = calcularDiagnostico(lead as unknown as Record<string, unknown>);
    const appUrl = process.env.APP_URL ?? 'https://app.raccolto.com.br';
    void this.mail.enviarDiagnosticoLead({
      to: lead.email,
      toNome: lead.nome.split(' ')[0],
      score,
      linkResultado: `${appUrl}/resultado/${lead.tokenResultado}`,
    });

    return lead;
  }

  async findAll(empresaId: string) {
    return this.prisma.diagnosticoLead.findMany({
      where: { empresaId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, nome: true, email: true, telefone: true,
        cidade: true, profissao: true, status: true, createdAt: true,
      },
    });
  }

  async findByToken(token: string) {
    const lead = await this.prisma.diagnosticoLead.findUnique({
      where: { tokenResultado: token },
    });
    if (!lead) throw new NotFoundException('Diagnóstico não encontrado.');
    return { ...lead, score: calcularDiagnostico(lead as unknown as Record<string, unknown>) };
  }

  async findOne(empresaId: string, id: string) {
    const lead = await this.prisma.diagnosticoLead.findFirst({
      where: { id, empresaId },
    });
    if (!lead) throw new NotFoundException('Lead não encontrado.');
    return { ...lead, score: calcularDiagnostico(lead as unknown as Record<string, unknown>) };
  }

  async updateStatus(empresaId: string, id: string, status: 'QUALIFICADO' | 'NAO_QUALIFICADO') {
    await this.findOne(empresaId, id);
    return this.prisma.diagnosticoLead.update({
      where: { id },
      data: { status },
    });
  }
}
