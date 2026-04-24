import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { StatusDocumento, TipoDocumento } from '@prisma/client';

export class CreateDocumentoDto {
  @IsOptional()
  @IsString()
  projetoId?: string;

  @IsOptional()
  @IsString()
  contratoId?: string;

  @IsOptional()
  @IsString()
  tarefaId?: string;

  @IsOptional()
  @IsString()
  entregavelId?: string;

  @IsString()
  nome!: string;

  @IsOptional()
  @IsEnum(TipoDocumento)
  tipo?: TipoDocumento;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsString()
  arquivoUrl?: string;

  @IsOptional()
  @IsString()
  versao?: string;

  @IsOptional()
  @IsEnum(StatusDocumento)
  status?: StatusDocumento;

  @IsOptional()
  @IsBoolean()
  exigeAssinatura?: boolean;

  @IsOptional()
  @IsBoolean()
  exigeAprovacao?: boolean;

  @IsOptional()
  @IsBoolean()
  visivelCliente?: boolean;

  @IsOptional()
  @IsDateString()
  dataEnvio?: string;

  @IsOptional()
  @IsDateString()
  dataConclusao?: string;

  @IsOptional()
  @IsString()
  observacaoInterna?: string;

  @IsOptional()
  @IsString()
  observacaoCliente?: string;
}
