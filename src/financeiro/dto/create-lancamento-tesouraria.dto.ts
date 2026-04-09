import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { TipoLancamentoTesouraria } from '@prisma/client';

export class CreateLancamentoTesourariaDto {
  @IsString()
  contaBancariaId!: string;

  @IsString()
  contaGerencialId!: string;

  @IsEnum(TipoLancamentoTesouraria)
  tipo!: TipoLancamentoTesouraria;

  @IsString()
  descricao!: string;

  @IsDateString()
  dataLancamento!: string;

  @Type(() => Number)
  @IsNumber()
  valor!: number;

  @IsOptional()
  @IsString()
  observacoes?: string;
}
