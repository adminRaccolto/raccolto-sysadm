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

  @IsString()
  @IsNotEmpty()
  nome!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  senha!: string;
}
