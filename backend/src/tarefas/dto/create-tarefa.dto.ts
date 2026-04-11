import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PrioridadeTarefa, StatusTarefa, TipoAtribuicaoTarefa } from '@prisma/client';

export class CreateTarefaDto {
  @IsString()
  projetoId!: string;

  @IsOptional()
  @IsString()
  etapaId?: string | null;

  @IsOptional()
  @IsEnum(TipoAtribuicaoTarefa)
  atribuicaoTipo?: TipoAtribuicaoTarefa;

  @IsOptional()
  @IsString()
  responsavelUsuarioId?: string;

  @IsOptional()
  @IsString()
  responsavelClienteId?: string;

  @IsString()
  titulo!: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsString()
  anexoUrl?: string;

  @IsOptional()
  @IsString()
  comentarioResumo?: string;

  @IsOptional()
  @IsBoolean()
  checklistHabilitado?: boolean;

  @IsOptional()
  @IsArray()
  checklistJson?: any[];

  @IsOptional()
  @IsArray()
  subtarefasJson?: any[];

  @IsOptional()
  @IsEnum(PrioridadeTarefa)
  prioridade?: PrioridadeTarefa;

  @IsOptional()
  @IsDateString()
  prazo?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimativaHoras?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  horasRegistradas?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  ordem?: number;

  @IsOptional()
  @IsEnum(StatusTarefa)
  status?: StatusTarefa;

  @IsOptional()
  @IsString()
  aprovadorTipo?: string;

  @IsOptional()
  @IsString()
  aprovadorUsuarioId?: string;

  @IsOptional()
  @IsBoolean()
  visivelCliente?: boolean;
}
