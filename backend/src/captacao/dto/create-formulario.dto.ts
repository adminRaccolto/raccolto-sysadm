import { IsBoolean, IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { EtapaCrm } from '@prisma/client';

export class CreateFormularioDto {
  @IsString()
  @MinLength(2)
  nome!: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'slug deve conter apenas letras minúsculas, números e hífens' })
  slug!: string;

  @IsString()
  origemLead!: string; // WHATSAPP | EMAIL | INSTAGRAM | OUTRO

  @IsString()
  titulo!: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsString()
  produtoServicoId?: string;

  @IsOptional()
  @IsEnum(EtapaCrm)
  etapaInicial?: EtapaCrm;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
