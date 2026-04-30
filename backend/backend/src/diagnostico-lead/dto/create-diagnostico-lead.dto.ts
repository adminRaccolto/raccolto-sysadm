import { IsArray, IsBoolean, IsEmail, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateDiagnosticoLeadDto {
  // Pré-cadastro
  @IsString() @MinLength(2) nome!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(8) telefone!: string;
  @IsOptional() @IsInt() idade?: number;
  @IsOptional() @IsString() cidade?: string;
  @IsOptional() @IsString() profissao?: string;

  // Bloco 1 — Operação
  @IsOptional() @IsString() nomeFazenda?: string;
  @IsOptional() @IsArray() culturas?: string[];
  @IsOptional() @IsInt() percentualArrendado?: number;
  @IsOptional() @IsArray() operacoesTerceirizadas?: string[];
  @IsOptional() @IsBoolean() temSiloArmazem?: boolean;

  // Bloco 2 — Receitas e Custos
  // [{ cultura: string; media: number }]
  @IsOptional() produtividadeMedia?: { cultura: string; media: number }[];
  @IsOptional() @IsString() custosInsumosDiretos?: string;
  @IsOptional() @IsInt() hectaresPorTrabalhador?: number;
  @IsOptional() @IsBoolean() travaAntecipada?: boolean;
  @IsOptional() @IsBoolean() boaLeituraComercializacao?: boolean;

  // Bloco 3 — Financeiro
  // { s2022_2023_1?: number|null, s2022_2023_2?: number|null, ... }
  @IsOptional() frustracaoSafra?: Record<string, number | null>;
  @IsOptional() @IsString() percentualCusteio?: string;
  @IsOptional() @IsBoolean() captouMaisQuePageu?: boolean;

  // Bloco 4 — Gestão
  @IsOptional() @IsString() usaSoftwareGestao?: string;
  @IsOptional() @IsBoolean() sabeCustoPorSaca?: boolean;
  @IsOptional() @IsBoolean() clarezaCustos?: boolean;
  @IsOptional() @IsString() baseDecisoes?: string;
  @IsOptional() @IsBoolean() reuniaoFechamento?: boolean;
}
