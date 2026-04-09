import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { PrioridadeTarefa, StatusTarefa, TipoAtribuicaoTarefa } from '@prisma/client';

export class CreateTarefaDto {
  @IsString()
  projetoId!: string;

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
  @IsEnum(StatusTarefa)
  status?: StatusTarefa;

  @IsOptional()
  @IsBoolean()
  visivelCliente?: boolean;
}
