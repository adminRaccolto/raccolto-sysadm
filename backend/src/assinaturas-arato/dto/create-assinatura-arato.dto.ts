import { IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { ModalidadeAssinaturaArato } from '@prisma/client';

export class CreateAssinaturaAratoDto {
  @IsString() @IsNotEmpty()
  clienteId!: string;

  @IsString() @IsNotEmpty()
  produtoServicoId!: string;

  @IsString() @IsOptional()
  contaGerencialId?: string;

  @IsNumber()
  valorMensal!: number;

  @IsInt() @Min(1) @Max(28)
  diaVencimento!: number;

  @IsDateString()
  dataInicio!: string;

  @IsEnum(ModalidadeAssinaturaArato) @IsOptional()
  modalidade?: ModalidadeAssinaturaArato;

  @IsBoolean() @IsOptional()
  probono?: boolean;
}
