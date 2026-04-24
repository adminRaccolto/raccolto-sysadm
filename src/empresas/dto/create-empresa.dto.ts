import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateEmpresaDto {
  @IsString()
  nome!: string;

  @IsOptional()
  @IsString()
  nomeFantasia?: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telefone?: string;
}
