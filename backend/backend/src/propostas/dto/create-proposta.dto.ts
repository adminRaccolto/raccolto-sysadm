import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class PropostaCobrancaDto {
  @IsNumber()
  ordem!: number;

  @IsDateString()
  vencimento!: string;

  @IsNumber()
  valor!: number;

  @IsOptional()
  @IsString()
  descricao?: string;
}

export class CreatePropostaDto {
  @IsString()
  clienteId!: string;

  @IsOptional()
  @IsString()
  produtoServicoId?: string;

  @IsString()
  titulo!: string;

  @IsOptional()
  @IsString()
  objeto?: string;

  @IsOptional()
  @IsString()
  responsavelInterno?: string;

  @IsOptional()
  @IsString()
  contatoClienteNome?: string;

  @IsOptional()
  @IsString()
  contatoClienteEmail?: string;

  @IsOptional()
  @IsString()
  contatoClienteTelefone?: string;

  @IsOptional()
  @IsNumber()
  valor?: number;

  @IsOptional()
  @IsString()
  moeda?: string;

  @IsOptional()
  @IsString()
  formaPagamento?: string;

  @IsOptional()
  @IsString()
  periodicidadeCobranca?: string;

  @IsOptional()
  @IsNumber()
  quantidadeParcelas?: number;

  @IsOptional()
  @IsNumber()
  valorParcela?: number;

  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @IsOptional()
  @IsDateString()
  primeiroVencimento?: string;

  @IsOptional()
  @IsDateString()
  validadeAte?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;

  @IsOptional()
  @IsString()
  textoPropostaBase?: string;

  @IsOptional()
  @IsBoolean()
  gerarContratoAutomatico?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PropostaCobrancaDto)
  cobrancas?: PropostaCobrancaDto[];
}
