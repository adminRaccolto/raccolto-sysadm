import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateEtapaDto {
  @IsString()
  nome!: string;

  @IsOptional()
  @IsString()
  meta?: string;

  @IsDateString()
  dataInicio!: string;

  @IsDateString()
  dataFim!: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  ordem?: number;
}
