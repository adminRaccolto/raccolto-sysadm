import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCentroCustoDto {
  @IsString()
  codigo!: string;

  @IsString()
  @MinLength(2)
  descricao!: string;

  @IsOptional()
  @IsString()
  contaPaiId?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
