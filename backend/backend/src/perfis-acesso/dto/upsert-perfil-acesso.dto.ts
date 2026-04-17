import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class PermissaoDto {
  @IsString()
  recursoSistemaId!: string;

  @IsOptional()
  @IsBoolean()
  visualizar?: boolean;

  @IsOptional()
  @IsBoolean()
  criar?: boolean;

  @IsOptional()
  @IsBoolean()
  editar?: boolean;

  @IsOptional()
  @IsBoolean()
  excluir?: boolean;

  @IsOptional()
  @IsBoolean()
  aprovar?: boolean;

  @IsOptional()
  @IsBoolean()
  administrar?: boolean;
}

export class UpsertPerfilAcessoDto {
  @IsString()
  nome!: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissaoDto)
  permissoes!: PermissaoDto[];
}
