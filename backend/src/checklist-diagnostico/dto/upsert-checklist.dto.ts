import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CulturaAreaDto {
  @IsString()
  cultura!: string;

  @IsOptional()
  @IsNumber()
  area?: number;

  @IsOptional()
  @IsNumber()
  mediaHistorica?: number;
}

export class FrustracacaoDto {
  @IsOptional()
  @IsString()
  ano?: string;

  @IsOptional()
  @IsString()
  cultura?: string;

  @IsOptional()
  @IsNumber()
  mediaColhida?: number;
}

export class FazendaDiagnosticoDto {
  @IsString()
  nomeFazenda!: string;

  @IsOptional()
  @IsNumber()
  areaTotal?: number;

  @IsOptional()
  @IsNumber()
  areaPlantio?: number;

  @IsOptional()
  @IsNumber()
  areaPlantioPropia?: number;

  @IsOptional()
  @IsNumber()
  areaPlantioArrendada?: number;

  @IsArray()
  @IsString({ each: true })
  culturas!: string[];

  @IsOptional()
  @IsString()
  culturaOutro?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CulturaAreaDto)
  culturasAreas!: CulturaAreaDto[];

  @IsBoolean()
  frustracaoSafra!: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FrustracacaoDto)
  frustracoes!: FrustracacaoDto[];
}

export class UpsertChecklistDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FazendaDiagnosticoDto)
  fazendas!: FazendaDiagnosticoDto[];

  // Bloco 3
  @IsOptional()
  @IsBoolean()
  negocioFamiliar?: boolean;

  @IsOptional()
  @IsNumber()
  membrosEnvolvidos?: number;

  @IsOptional()
  @IsBoolean()
  decisaoPorConselho?: boolean;

  @IsOptional()
  @IsBoolean()
  emSucessao?: boolean;

  @IsOptional()
  @IsString()
  geracaoSucessao?: string;

  @IsOptional()
  @IsBoolean()
  funcoesDefinidas?: boolean;

  @IsOptional()
  @IsBoolean()
  governancaImplantada?: boolean;

  // Bloco 4
  @IsOptional()
  @IsBoolean()
  utilizaSistemaGestao?: boolean;

  @IsOptional()
  @IsString()
  qualSistema?: string;

  @IsOptional()
  @IsBoolean()
  sabeCustoProduzir?: boolean;

  @IsOptional()
  @IsBoolean()
  temFluxoCaixaProjetado?: boolean;

  @IsOptional()
  @IsBoolean()
  sabeCompromissoFuturo?: boolean;

  @IsOptional()
  @IsString()
  baseComercializacao?: string;

  @IsOptional()
  @IsBoolean()
  travaComercializacao?: boolean;

  @IsOptional()
  @IsBoolean()
  negocioAlavancado?: boolean;

  // Bloco 5
  @IsOptional()
  @IsString()
  expectativaParceria?: string;
}
