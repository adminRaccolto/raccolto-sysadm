import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class ParcelaRecebivelDto {
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

export class CreateRecebivelDto {
  @IsString()
  clienteId!: string;

  @IsOptional()
  @IsString()
  contratoId?: string;

  @IsOptional()
  @IsString()
  produtoServicoId?: string;

  @IsString()
  contaGerencialId!: string;

  @IsString()
  descricao!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  parcelaNumero?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalParcelas?: number;

  @Type(() => Number)
  @IsNumber()
  valor!: number;

  @IsDateString()
  vencimento!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParcelaRecebivelDto)
  parcelas?: ParcelaRecebivelDto[];

  @IsOptional()
  @IsBoolean()
  previsao?: boolean;
}
