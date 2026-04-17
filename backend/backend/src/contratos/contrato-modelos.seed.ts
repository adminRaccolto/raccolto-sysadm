import { PrismaClient } from '@prisma/client';

const MODELOS_PADRAO = [
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
];

export async function ensureContratoModelosPadrao(tx: PrismaClient | any, empresaId: string) {
  const existente = await tx.contratoModelo.count({ where: { empresaId } });
  if (existente > 0) return;

  await tx.contratoModelo.createMany({
    data: MODELOS_PADRAO.map((item) => ({
      empresaId,
      nome: item.nome,
      descricao: item.descricao,
      conteudo: item.conteudo,
      ativo: true,
      padrao: item.padrao,
    })),
  });
}
