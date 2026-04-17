import { IsDateString, IsOptional, IsString } from 'class-validator';

export class RegistrarPagamentoDto {
  @IsDateString()
  dataPagamento!: string;
}

export class ReagendarRecebivelDto {
  @IsDateString()
  novoVencimento!: string;

  @IsOptional()
  @IsString()
  observacao?: string;
}
