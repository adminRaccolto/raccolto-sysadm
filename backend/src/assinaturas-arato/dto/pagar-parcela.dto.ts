import { IsDateString, IsNumber, IsOptional } from 'class-validator';

export class PagarParcelaDto {
  @IsDateString()
  dataPagamento!: string;

  @IsNumber() @IsOptional()
  valorPago?: number;
}
