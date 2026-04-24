import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { PerfilUsuario } from '@prisma/client';

export class CreateUsuarioDto {
  @IsString()
  nome!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  senha!: string;

  @IsEnum(PerfilUsuario)
  perfil!: PerfilUsuario;

  @IsOptional()
  @IsString()
  clienteId?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
