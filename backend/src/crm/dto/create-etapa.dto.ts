import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateEtapaDto {
  @IsString()
  @MinLength(1)
  chave!: string;

  @IsString()
  @MinLength(1)
  nome!: string;

  @IsOptional()
  @IsString()
  cor?: string;

  @IsOptional()
  @IsInt()
  ordem?: number;
}

export class UpdateEtapaDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  nome?: string;

  @IsOptional()
  @IsString()
  cor?: string;

  @IsOptional()
  @IsInt()
  ordem?: number;
}
