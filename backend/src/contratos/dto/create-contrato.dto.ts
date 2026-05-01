import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StatusAssinatura, StatusContrato } from '@prisma/client';

export class ContratoCobrancaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  ordem!: number;

  @IsDateString()
  vencimento!: string;

  @Type(() => Number)
  @IsNumber()
  valor!: number;

  @IsOptional()
  @IsString()
  descricao?: string;
}

export class CreateContratoDto {
  @IsString()
  clienteId!: string;

  @IsOptional()
  @IsString()
  produtoServicoId?: string;

  @IsOptional()
  @IsString()
  numeroContrato?: string;

  @IsOptional()
  @IsString()
  codigo?: string;

  @IsString()
  titulo!: string;

  @IsOptional()
  @IsString()
  objeto?: string;

  @IsOptional()
  @IsString()
  tipoContrato?: string;

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
  @Type(() => Number)
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
  @Type(() => Number)
  @IsInt()
  quantidadeParcelas?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  valorParcela?: number;

  @IsDateString()
  dataInicio!: string;

  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @IsOptional()
  @IsDateString()
  primeiroVencimento?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  diaVencimento?: number;

  @IsOptional()
  @IsString()
  indiceReajuste?: string;

  @IsOptional()
  @IsString()
  periodicidadeReajuste?: string;

  @IsOptional()
  @IsBoolean()
  renovacaoAutomatica?: boolean;

  @IsOptional()
  @IsEnum(StatusContrato)
  status?: StatusContrato;

  @IsOptional()
  @IsEnum(StatusAssinatura)
  statusAssinatura?: StatusAssinatura;

  @IsOptional()
  @IsDateString()
  dataEmissao?: string;

  @IsOptional()
  @IsDateString()
  dataAssinatura?: string;

  @IsOptional()
  @IsBoolean()
  gerarProjetoAutomatico?: boolean;

  @IsOptional()
  @IsBoolean()
  gerarFinanceiroAutomatico?: boolean;

  @IsOptional()
  @IsString()
  modeloContratoNome?: string;

  @IsOptional()
  @IsString()
  textoContratoBase?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContratoCobrancaDto)
  cobrancas?: ContratoCobrancaDto[];
}
