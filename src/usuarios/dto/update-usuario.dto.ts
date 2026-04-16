import { IsArray, IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { PerfilUsuario } from '@prisma/client';

export class UpdateUsuarioDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  senha?: string;

  @IsOptional()
  @IsEnum(PerfilUsuario)
  perfil?: PerfilUsuario;

  @IsOptional()
  @IsString()
  clienteId?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsString()
  perfilAcessoId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  empresaIdsAcesso?: string[];
}
