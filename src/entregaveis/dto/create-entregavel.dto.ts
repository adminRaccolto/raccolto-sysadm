import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { StatusEntregavel, TipoEntregavel } from '@prisma/client';

export class CreateEntregavelDto {
  @IsString()
  projetoId!: string;

  @IsString()
  titulo!: string;

  @IsOptional()
  @IsEnum(TipoEntregavel)
  tipo?: TipoEntregavel;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsDateString()
  dataPrevista?: string;

  @IsOptional()
  @IsDateString()
  dataConclusao?: string;

  @IsOptional()
  @IsEnum(StatusEntregavel)
  status?: StatusEntregavel;

  @IsOptional()
  @IsBoolean()
  visivelCliente?: boolean;

  @IsOptional()
  @IsString()
  observacaoInterna?: string;

  @IsOptional()
  @IsString()
  observacaoCliente?: string;

  @IsOptional()
  @IsString()
  anexoUrl?: string;

  @IsOptional()
  @IsString()
  comentarioResumo?: string;
}
