import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoContaBancaria } from '@prisma/client';

export class CreateContaBancariaDto {
  @IsString()
  nome!: string;

  @IsOptional()
  @IsString()
  banco?: string;

  @IsOptional()
  @IsString()
  agencia?: string;

  @IsOptional()
  @IsString()
  numeroConta?: string;

  @IsOptional()
  @IsEnum(TipoContaBancaria)
  tipo?: TipoContaBancaria;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  saldoInicial?: number;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
