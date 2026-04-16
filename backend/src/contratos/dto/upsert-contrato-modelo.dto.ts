import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpsertContratoModeloDto {
  @IsString()
  nome!: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsString()
  conteudo!: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsBoolean()
  padrao?: boolean;
}
