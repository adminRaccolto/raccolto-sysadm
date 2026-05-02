import { IsDateString, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

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
}
