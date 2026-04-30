import { IsArray, IsDateString, IsEmail, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateOportunidadeDto {
  @IsString()
  titulo!: string;

  @IsString()
  empresaNome!: string;

  @IsOptional()
  @IsString()
  contatoNome?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsString()
  origemLead?: string;

  @IsOptional()
  @IsUUID()
  produtoServicoId?: string;

  @IsOptional()
  @IsUUID()
  responsavelId?: string;

  @IsOptional()
  @IsUUID()
  clienteId?: string;

  @IsOptional()
  @IsNumber()
  valorEstimado?: number;

  @IsOptional()
  @IsString()
  etapa?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  probabilidade?: number;

  @IsOptional()
  @IsDateString()
  previsaoFechamento?: string;

  @IsOptional()
  @IsString()
  proximaAcao?: string;

  @IsOptional()
  @IsDateString()
  dataProximaAcao?: string;

  @IsOptional()
  @IsString()
  motivoPerda?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
