import { TipoContaGerencial } from '@prisma/client';

export async function ensurePlanoContasPadrao(client: { contaGerencial: any }, empresaId: string) {
  const existente = await client.contaGerencial.count({ where: { empresaId } });
  if (existente > 0) return;

  const criar = async (
    codigo: string,
    descricao: string,
    tipo: TipoContaGerencial,
    contaPaiId: string | null = null,
    aceitaLancamento = true,
  ) => {
    return client.contaGerencial.create({
      data: {
        empresaId,
        contaPaiId,
        codigo,
        descricao,
        tipo,
        aceitaLancamento,
        ativo: true,
      },
    });
  };

  const receitas = await criar('1', 'Receitas', TipoContaGerencial.RECEITA, null, false);
  const receitasOperacionais = await criar('1.1', 'Receitas Operacionais', TipoContaGerencial.RECEITA, receitas.id, false);
  await criar('1.1.1', 'Consultoria', TipoContaGerencial.RECEITA, receitasOperacionais.id, true);
  await criar('1.1.2', 'Mentoria', TipoContaGerencial.RECEITA, receitasOperacionais.id, true);
  await criar('1.1.3', 'Valuation', TipoContaGerencial.RECEITA, receitasOperacionais.id, true);
  await criar('1.1.4', 'Estudo de Viabilidade', TipoContaGerencial.RECEITA, receitasOperacionais.id, true);
  await criar('1.1.5', 'Conselheiro', TipoContaGerencial.RECEITA, receitasOperacionais.id, true);
  const outrasReceitas = await criar('1.2', 'Outras Receitas', TipoContaGerencial.RECEITA, receitas.id, false);
  await criar('1.2.1', 'Juros Recebidos', TipoContaGerencial.RECEITA, outrasReceitas.id, true);
  await criar('1.2.2', 'Reembolsos', TipoContaGerencial.RECEITA, outrasReceitas.id, true);
  await criar('1.2.3', 'Receitas Não Operacionais', TipoContaGerencial.RECEITA, outrasReceitas.id, true);

  const custos = await criar('2', 'Custos Diretos dos Serviços', TipoContaGerencial.CUSTO, null, false);
  await criar('2.1', 'Terceiros Vinculados a Projetos', TipoContaGerencial.CUSTO, custos.id, true);
  await criar('2.2', 'Deslocamentos de Projeto', TipoContaGerencial.CUSTO, custos.id, true);
  await criar('2.3', 'Ferramentas Específicas por Contrato', TipoContaGerencial.CUSTO, custos.id, true);

  const despesas = await criar('3', 'Despesas Operacionais', TipoContaGerencial.DESPESA, null, false);
  const administrativas = await criar('3.1', 'Administrativas', TipoContaGerencial.DESPESA, despesas.id, false);
  await criar('3.1.1', 'Salários e Pró-labore', TipoContaGerencial.DESPESA, administrativas.id, true);
  await criar('3.1.2', 'Encargos', TipoContaGerencial.DESPESA, administrativas.id, true);
  await criar('3.1.3', 'Aluguel', TipoContaGerencial.DESPESA, administrativas.id, true);
  await criar('3.1.4', 'Internet e Telefonia', TipoContaGerencial.DESPESA, administrativas.id, true);
  await criar('3.1.5', 'Softwares e Sistemas', TipoContaGerencial.DESPESA, administrativas.id, true);
  await criar('3.1.6', 'Contabilidade', TipoContaGerencial.DESPESA, administrativas.id, true);
  await criar('3.1.7', 'Jurídico', TipoContaGerencial.DESPESA, administrativas.id, true);
  await criar('3.1.8', 'Material de Escritório', TipoContaGerencial.DESPESA, administrativas.id, true);
  const comerciais = await criar('3.2', 'Comerciais', TipoContaGerencial.DESPESA, despesas.id, false);
  await criar('3.2.1', 'Marketing', TipoContaGerencial.DESPESA, comerciais.id, true);
  await criar('3.2.2', 'Tráfego', TipoContaGerencial.DESPESA, comerciais.id, true);
  await criar('3.2.3', 'Comissões', TipoContaGerencial.DESPESA, comerciais.id, true);
  await criar('3.2.4', 'Prospecção', TipoContaGerencial.DESPESA, comerciais.id, true);
  const gerais = await criar('3.3', 'Despesas Gerais', TipoContaGerencial.DESPESA, despesas.id, false);
  await criar('3.3.1', 'Viagens', TipoContaGerencial.DESPESA, gerais.id, true);
  await criar('3.3.2', 'Reuniões', TipoContaGerencial.DESPESA, gerais.id, true);
  await criar('3.3.3', 'Assinaturas Diversas', TipoContaGerencial.DESPESA, gerais.id, true);

  const financeiras = await criar('4', 'Financeiras', TipoContaGerencial.DESPESA, null, false);
  await criar('4.1', 'Tarifas Bancárias', TipoContaGerencial.DESPESA, financeiras.id, true);
  await criar('4.2', 'Juros Pagos', TipoContaGerencial.DESPESA, financeiras.id, true);
  await criar('4.3', 'IOF', TipoContaGerencial.DESPESA, financeiras.id, true);
  await criar('4.4', 'Multas', TipoContaGerencial.DESPESA, financeiras.id, true);

  const investimentos = await criar('5', 'Investimentos', TipoContaGerencial.INVESTIMENTO, null, false);
  await criar('5.1', 'Equipamentos', TipoContaGerencial.INVESTIMENTO, investimentos.id, true);
  await criar('5.2', 'Estruturação de Sistemas', TipoContaGerencial.INVESTIMENTO, investimentos.id, true);
  await criar('5.3', 'Desenvolvimento Tecnológico', TipoContaGerencial.INVESTIMENTO, investimentos.id, true);

  const tesouraria = await criar('6', 'Tesouraria', TipoContaGerencial.TESOURARIA, null, false);
  await criar('6.1', 'Movimentações de Caixa e Bancos', TipoContaGerencial.TESOURARIA, tesouraria.id, true);
  await criar('6.2', 'Ajustes de Saldo', TipoContaGerencial.TESOURARIA, tesouraria.id, true);
}
