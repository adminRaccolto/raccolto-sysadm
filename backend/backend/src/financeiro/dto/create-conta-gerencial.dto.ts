import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { TipoContaGerencial } from '@prisma/client';

export class CreateContaGerencialDto {
  @IsString()
  codigo!: string;

  @IsString()
  descricao!: string;

  @IsEnum(TipoContaGerencial)
  tipo!: TipoContaGerencial;

  @IsOptional()
  @IsString()
  contaPaiId?: string;

  @IsOptional()
  @IsBoolean()
  aceitaLancamento?: boolean;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
