import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class ParcelaContaPagarDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  parcelaNumero!: number;

  @Type(() => Number)
  @IsNumber()
  valor!: number;

  @IsDateString()
  vencimento!: string;
}

export class CreateContaPagarDto {
  @IsString()
  contaGerencialId!: string;

  @IsOptional()
  @IsString()
  fornecedor?: string;

  @IsString()
  descricao!: string;

  @IsOptional()
  @IsDateString()
  dataCompra?: string;

  @IsOptional()
  @IsDateString()
  competencia?: string;

  @IsDateString()
  vencimento!: string;

  @Type(() => Number)
  @IsNumber()
  valor!: number;

  @IsOptional()
  @IsBoolean()
  parcelado?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(2)
  totalParcelas?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParcelaContaPagarDto)
  parcelas?: ParcelaContaPagarDto[];

  @IsOptional()
  @IsBoolean()
  previsao?: boolean;

  @IsOptional()
  @IsBoolean()
  recorrente?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(2)
  quantidadeRecorrencias?: number;

  @IsOptional()
  @IsString()
  anexoUrl?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}
