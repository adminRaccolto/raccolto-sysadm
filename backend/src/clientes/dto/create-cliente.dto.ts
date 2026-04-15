import { IsEmail, IsEnum, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';
import { StatusCliente, TipoPessoa } from '@prisma/client';

export class CreateClienteDto {
  @IsOptional()
  @IsEnum(TipoPessoa)
  tipoPessoa?: TipoPessoa;

  @IsString()
  razaoSocial!: string;

  @IsOptional()
  @IsString()
  nomeFantasia?: string;

  @IsOptional()
  @IsString()
  cpfCnpj?: string;

  @IsOptional()
  @IsString()
  inscricaoEstadual?: string;

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
  contatoPrincipal?: string;

  @IsOptional()
  @IsString()
  @Length(8, 9)
  cep?: string;

  @IsOptional()
  @IsString()
  logradouro?: string;

  @IsOptional()
  @IsString()
  numero?: string;

  @IsOptional()
  @IsString()
  complemento?: string;

  @IsOptional()
  @IsString()
  bairro?: string;

  @IsOptional()
  @IsString()
  cidade?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsEnum(StatusCliente)
  status?: StatusCliente;

  @IsOptional()
  @IsString()
  nomeFazenda?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  distanciaKm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precoKmReembolso?: number;
}
