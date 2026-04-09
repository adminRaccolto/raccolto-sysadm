import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class BootstrapAdminDto {
  @IsString()
  @IsNotEmpty()
  empresaNome!: string;

  @IsOptional()
  @IsString()
  empresaNomeFantasia?: string;

  @IsOptional()
  @IsString()
  empresaCnpj?: string;

  @IsOptional()
  @IsEmail()
  empresaEmail?: string;

  @IsOptional()
  @IsString()
  empresaTelefone?: string;


  @IsOptional()
  @IsString()
  empresaLogradouro?: string;

  @IsOptional()
  @IsString()
  empresaNumero?: string;

  @IsOptional()
  @IsString()
  empresaComplemento?: string;

  @IsOptional()
  @IsString()
  empresaBairro?: string;

  @IsOptional()
  @IsString()
  empresaCidade?: string;

  @IsOptional()
  @IsString()
  empresaEstado?: string;

  @IsOptional()
  @IsString()
  empresaCep?: string;

  @IsOptional()
  @IsString()
  empresaRepresentanteNome?: string;

  @IsOptional()
  @IsString()
  empresaRepresentanteCargo?: string;

  @IsOptional()
  @IsString()
  empresaLogoUrl?: string;

  @IsString()
  @IsNotEmpty()
  nome!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  senha!: string;
}
