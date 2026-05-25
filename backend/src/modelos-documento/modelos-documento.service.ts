import { BadRequestException, Injectable } from '@nestjs/common';
import { TipoModeloDocumento } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const MODELOS_PADRAO_CONTRATO = [
  {
    nome: 'Contrato padrão',
    descricao: 'Modelo base de prestação de serviços com preenchimento automático.',
    padrao: true,
    conteudo: `INSTRUMENTO PARTICULAR DE CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE CONSULTORIA

CONTRATADA: {{contratada_nome_razao_social}}, inscrita no CPF/CNPJ sob o nº {{contratada_documento}}, com sede em {{contratada_endereco_completo}}, neste ato representada por {{contratada_representante_nome}}, na qualidade de {{contratada_representante_cargo}}.

CONTRATANTE: {{contratante_nome_razao_social}}, inscrito no CPF/CNPJ sob o nº {{contratante_documento}}, residente ou sediado em {{contratante_endereco_completo}}.

CLÁUSULA PRIMEIRA – DO OBJETO
1.1. O objeto deste contrato é a prestação de serviços de consultoria empresarial pela CONTRATADA, visando a {{objeto_contrato}} da CONTRATANTE.

CLÁUSULA SEGUNDA – DAS CONDIÇÕES DE EXECUÇÃO E PRAZOS
2.1. Os serviços terão duração estimada de {{duracao_contrato}}, com início em {{data_inicio_contrato}} e término previsto para {{data_fim_contrato}}.

2.2. A execução ocorrerá de forma híbrida (presencial e remota). A CONTRATANTE deverá fornecer acesso a dados, sistemas e equipe técnica sempre que solicitado, sob pena de suspensão do cronograma sem prejuízo dos pagamentos.

CLÁUSULA TERCEIRA – DOS HONORÁRIOS E DA MORA
3.1. Pelos serviços, a CONTRATANTE pagará o valor global de {{valor_global_contrato}}, dividido em parcelas conforme o cronograma financeiro aceito pelas partes abaixo representado:

{{grade_parcelamento_contrato}}

3.2. IMPONTUALIDADE: O atraso no pagamento de qualquer parcela sujeitará a CONTRATANTE, independente de notificação, à multa moratória de 20% (vinte por cento) sobre o valor devido, acrescida de juros de 1% ao mês e correção monetária pelo IPCA/IBGE pro rata die.

CLÁUSULA QUARTA – DOS REEMBOLSOS E LOGÍSTICA
4.1. Despesas de deslocamento, hospedagem e alimentação fora de Nova Mutum/MT correrão por conta da CONTRATANTE.

4.2. Deslocamento: R$ 3,00/km (terra).

4.3. Limites Diários: Alimentação: R$ 240,00 por consultor em deslocamento.

4.4. OPÇÃO DE RESERVA: A critério da CONTRATANTE, esta poderá realizar as reservas e pagamentos de hotéis e refeições diretamente, desde que respeitados os padrões mínimos de higiene, segurança e conforto adequados à execução do serviço.

CLÁUSULA QUINTA – DA PROPRIEDADE INTELECTUAL E SIGILO
5.1. Todas as metodologias, planilhas e ferramentas apresentadas pela CONTRATADA são de sua propriedade intelectual exclusiva. A CONTRATANTE possui apenas licença de uso interno, sendo vedada a reprodução ou cessão a terceiros.

5.2. As partes obrigam-se ao sigilo absoluto sobre dados estratégicos e financeiros trocados durante a vigência deste instrumento.

CLÁUSULA SEXTA – DA RESCISÃO
6.1. O contrato pode ser rescindido por qualquer parte mediante aviso prévio por escrito de 90 (noventa) dias.

6.2. CLÁUSULA PENAL: Caso a CONTRATANTE rescinda o contrato de forma antecipada e imotivada, deverá pagar à CONTRATADA multa rescisória de 30% (trinta por cento) sobre o valor total global do contrato, além dos valores proporcionais ao aviso prévio e serviços já realizados.

CLÁUSULA SÉTIMA – DA NÃO CONTRATAÇÃO
7.1. A CONTRATANTE não poderá contratar colaboradores da CONTRATADA por até 12 meses após o fim deste contrato, sob pena de multa equivalente a 10 vezes a remuneração mensal do profissional envolvido.

CLÁUSULA OITAVA – DO FORO
8.1. Fica eleito o Foro da Comarca de Nova Mutum/MT para dirimir quaisquer controvérsias.

{{localidade_assinatura}}, {{dia_assinatura}} de {{mes_assinatura}} de {{ano_assinatura}}.
`,
  },
  {
    nome: 'Consultoria em Gestão Financeira e Estratégica',
    descricao: 'Modelo para contratos de consultoria financeira e estratégica, com cláusulas de reembolso, mora e não contratação.',
    padrao: false,
    conteudo: `INSTRUMENTO PARTICULAR DE CONTRATO DE PRESTAÇÃO DE SERVIÇOS

CONTRATADA: {{contratada_nome_razao_social}}, empresa de consultoria inscrita no CNPJ sob o nº {{contratada_documento}}, com sede na {{contratada_endereco_completo}}, neste ato representada por {{contratada_representante_nome}}, {{contratada_representante_cargo}}.

CONTRATANTE: {{contratante_nome_razao_social}}, inscrito(a) no CPF/CNPJ sob o nº {{contratante_documento}}, residente ou sediado(a) na {{contratante_endereco_completo}}.

As partes acima qualificadas celebram o presente Instrumento Particular de Contrato de Prestação de Serviços, que se regerá pelas cláusulas e condições a seguir:

CLÁUSULA I – DO OBJETO
1.1. O objeto deste contrato é a prestação de serviços de {{objeto_contrato}} pela CONTRATADA em benefício da CONTRATANTE.

1.2. Os serviços abrangem, de forma não exaustiva: diagnóstico financeiro e estratégico, estruturação de fluxo de caixa, indicadores de desempenho (KPIs), planejamento orçamentário, suporte à tomada de decisão e implantação de controles gerenciais.

CLÁUSULA II – DAS CONDIÇÕES DE EXECUÇÃO E PRAZO
2.1. Os serviços serão prestados pelo período de {{duracao_contrato}}, com início em {{data_inicio_contrato}} e término previsto para {{data_fim_contrato}}.

2.2. A execução ocorrerá de forma híbrida (presencial e remota), conforme agenda acordada entre as partes.

2.3. A CONTRATANTE compromete-se a disponibilizar todas as informações, dados contábeis, financeiros e operacionais necessários, bem como acesso à equipe responsável, sempre que solicitado pela CONTRATADA. O descumprimento desta obrigação poderá suspender o cronograma de execução sem prejuízo das obrigações de pagamento.

CLÁUSULA III – DOS HONORÁRIOS E DA MORA
3.1. Pelos serviços prestados, a CONTRATANTE pagará à CONTRATADA o valor global de {{valor_global_contrato}}, conforme cronograma de pagamentos abaixo:

{{grade_parcelamento_contrato}}

3.2. IMPONTUALIDADE: O atraso no pagamento de qualquer parcela sujeitará a CONTRATANTE, independentemente de notificação ou interpelação judicial, à multa moratória de 5% (cinco por cento) sobre o valor da parcela em atraso, acrescida de encargo diário de R$ 92,50 (noventa e dois reais e cinquenta centavos) por dia de atraso, até o efetivo pagamento.

3.3. O não pagamento de três parcelas consecutivas ou cinco alternadas, no prazo de 30 (trinta) dias após o vencimento, faculta à CONTRATADA a rescisão imediata do contrato, com exigibilidade das parcelas vincendas como antecipação de dano, sem prejuízo das demais penalidades.

CLÁUSULA IV – DOS REEMBOLSOS E LOGÍSTICA
4.1. Deslocamentos, hospedagem e alimentação realizados fora da localidade de origem da CONTRATADA são de responsabilidade da CONTRATANTE e serão reembolsados mediante apresentação de comprovantes, nos seguintes limites:

4.2. DESLOCAMENTO: R$ 2,50/km em rodovias asfaltadas e R$ 2,80/km em estradas não pavimentadas.

4.3. ALIMENTAÇÃO: Até R$ 120,00 (cento e vinte reais) por consultor por dia em deslocamento.

4.4. HOSPEDAGEM: Até R$ 210,00 (duzentos e dez reais) por pessoa por diária.

4.5. OPÇÃO DE RESERVA: A CONTRATANTE poderá, a seu critério, realizar diretamente as reservas e pagamentos de hospedagem e refeições, desde que sejam respeitados padrões mínimos de higiene, segurança e conforto compatíveis com a execução do serviço.

CLÁUSULA V – DA PROPRIEDADE INTELECTUAL
5.1. Todas as metodologias, modelos, planilhas, ferramentas, relatórios e materiais desenvolvidos ou apresentados pela CONTRATADA no âmbito deste contrato são de sua propriedade intelectual exclusiva.

5.2. A CONTRATANTE recebe apenas licença de uso interno e intransferível, sendo expressamente vedada a reprodução, cessão, venda ou disponibilização a terceiros, sob pena de indenização por danos materiais e morais.

CLÁUSULA VI – DO SIGILO
6.1. As partes se obrigam, durante a vigência deste contrato e por 5 (cinco) anos após o seu término, a manter absoluto sigilo sobre informações estratégicas, financeiras, operacionais e comerciais a que tiverem acesso em razão desta relação contratual.

6.2. A quebra de sigilo por qualquer das partes sujeitará a infratora ao pagamento de indenização mínima correspondente a 50% (cinquenta por cento) do valor global do contrato, sem prejuízo de eventuais perdas e danos adicionais.

CLÁUSULA VII – DA RESCISÃO
7.1. O presente contrato poderá ser rescindido por qualquer das partes mediante aviso prévio por escrito com antecedência mínima de 30 (trinta) dias.

7.2. RESCISÃO IMOTIVADA PELA CONTRATANTE: Na hipótese de rescisão antecipada e imotivada pela CONTRATANTE, esta deverá pagar à CONTRATADA, a título de cláusula penal, o equivalente a 30% (trinta por cento) do saldo remanescente do contrato, além das parcelas proporcionais ao período de aviso prévio e serviços já executados.

7.3. RESCISÃO POR JUSTA CAUSA: O descumprimento reiterado de obrigações contratuais por qualquer das partes faculta à outra a rescisão imediata, sem necessidade de aviso prévio, com direito à indenização pelos prejuízos comprovados.

CLÁUSULA VIII – DA NÃO CONTRATAÇÃO
8.1. A CONTRATANTE compromete-se a não contratar, direta ou indiretamente, qualquer profissional vinculado à CONTRATADA pelo prazo de 24 (vinte e quatro) meses contados do término deste contrato.

8.2. O descumprimento desta cláusula sujeitará a CONTRATANTE ao pagamento de multa equivalente a 10 (dez) vezes a última remuneração mensal do profissional envolvido, por cada profissional contratado indevidamente.

CLÁUSULA IX – DO FORO
9.1. Fica eleito o Foro da Comarca de {{localidade_assinatura}}/MT para dirimir quaisquer dúvidas ou controvérsias decorrentes do presente contrato, com expressa renúncia a qualquer outro, por mais privilegiado que seja.

Por estarem assim justas e contratadas, as partes assinam o presente instrumento em 2 (duas) vias de igual teor e forma, na presença das testemunhas abaixo.

{{localidade_assinatura}}, {{dia_assinatura}} de {{mes_assinatura}} de {{ano_assinatura}}.


________________________________________
CONTRATADA
{{contratada_representante_nome}}
{{contratada_nome_razao_social}}
CNPJ: {{contratada_documento}}


________________________________________
CONTRATANTE
{{contratante_nome_razao_social}}
CPF/CNPJ: {{contratante_documento}}


TESTEMUNHAS:

________________________________________
Nome:
CPF:

________________________________________
Nome:
CPF:
`,
  },
];

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

  async ensureModelosPadrao(empresaId: string) {
    for (const modelo of MODELOS_PADRAO_CONTRATO) {
      const existente = await this.prisma.modeloDocumento.findFirst({ where: { empresaId, tipo: 'CONTRATO', nome: modelo.nome } });
      if (existente) continue;

      await this.prisma.modeloDocumento.create({
        data: {
          empresaId,
          tipo: 'CONTRATO',
          nome: modelo.nome,
          descricao: modelo.descricao,
          padrao: modelo.padrao,
          ativo: true,
          conteudo: modelo.conteudo,
        },
      });
    }
  }
}
