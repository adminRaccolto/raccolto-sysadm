import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PrioridadeProjeto, StatusProjeto } from '@prisma/client';

export class CreateProjetoDto {
  @IsString()
  clienteId!: string;

  @IsOptional()
  @IsString()
  contratoId?: string;

  @IsOptional()
  @IsString()
  produtoServicoId?: string;

  @IsOptional()
  @IsString()
  responsavelId?: string;

  @IsOptional()
  @IsString()
  gerenteId?: string;

  @IsOptional()
  @IsString()
  cor?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  membroIds?: string[];

  @IsString()
  nome!: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsString()
  equipeEnvolvida?: string;

  @IsOptional()
  @IsString()
  tipoServicoProjeto?: string;

  @IsOptional()
  @IsString()
  faseAtual?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  percentualAndamento?: number;

  @IsOptional()
  @IsEnum(PrioridadeProjeto)
  prioridade?: PrioridadeProjeto;

  @IsOptional()
  @IsBoolean()
  recorrente?: boolean;

  @IsOptional()
  @IsBoolean()
  checklistInicialHabilitado?: boolean;

  @IsOptional()
  @IsString()
  modeloPadraoNome?: string;

  @IsDateString()
  dataInicio!: string;

  @IsOptional()
  @IsDateString()
  dataFimPrevista?: string;

  @IsOptional()
  @IsDateString()
  dataInicioReal?: string;

  @IsOptional()
  @IsDateString()
  dataFimReal?: string;

  @IsOptional()
  @IsEnum(StatusProjeto)
  status?: StatusProjeto;

  @IsOptional()
  @IsBoolean()
  visivelCliente?: boolean;
}
